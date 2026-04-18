from flask import Blueprint, request, jsonify, redirect, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User
from datetime import datetime
import requests as http_requests
import json

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# ──────────────────────────────────────────────
# Google OAuth 2.0
# ──────────────────────────────────────────────

GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

@auth_bp.route('/google/login', methods=['GET'])
def google_login():
    """Redirect to Google OAuth consent screen"""
    client_id = current_app.config.get('GOOGLE_CLIENT_ID')
    redirect_uri = current_app.config.get('GOOGLE_REDIRECT_URI')

    if not client_id:
        return jsonify({'message': 'Google OAuth not configured'}), 500

    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': 'openid email profile',
        'access_type': 'offline',
        'prompt': 'select_account',
    }

    query_string = '&'.join(f'{k}={v}' for k, v in params.items())
    return redirect(f'{GOOGLE_AUTH_URL}?{query_string}')


@auth_bp.route('/google/callback', methods=['GET'])
def google_callback():
    """Handle Google OAuth callback"""
    code = request.args.get('code')
    error = request.args.get('error')
    # Use the first configured CORS origin as the frontend URL
    cors_origins = current_app.config.get('CORS_ORIGINS', ['http://localhost:3000'])
    frontend_url = cors_origins[0] if isinstance(cors_origins, list) else cors_origins
    if error:
        return redirect(f'{frontend_url}/login?error=google_denied')

    if not code:
        return redirect(f'{frontend_url}/login?error=no_code')

    try:
        client_id = current_app.config.get('GOOGLE_CLIENT_ID')
        client_secret = current_app.config.get('GOOGLE_CLIENT_SECRET')
        redirect_uri = current_app.config.get('GOOGLE_REDIRECT_URI')

        # Exchange authorization code for tokens
        token_response = http_requests.post(GOOGLE_TOKEN_URL, data={
            'code': code,
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code',
        }, timeout=10)

        if token_response.status_code != 200:
            print(f'❌ Google token exchange failed: {token_response.text}')
            return redirect(f'{frontend_url}/login?error=token_exchange_failed')

        tokens = token_response.json()
        access_token = tokens.get('access_token')

        if not access_token:
            return redirect(f'{frontend_url}/login?error=no_access_token')

        # Get user info from Google
        userinfo_response = http_requests.get(GOOGLE_USERINFO_URL, headers={
            'Authorization': f'Bearer {access_token}'
        }, timeout=10)

        if userinfo_response.status_code != 200:
            print(f'❌ Google userinfo failed: {userinfo_response.text}')
            return redirect(f'{frontend_url}/login?error=userinfo_failed')

        userinfo = userinfo_response.json()

        email = userinfo.get('email')
        email_verified = userinfo.get('email_verified', False)
        name = userinfo.get('name', '')
        picture = userinfo.get('picture', '')

        # Reject unverified emails
        if not email_verified:
            return redirect(f'{frontend_url}/login?error=email_not_verified')

        # Find or create user
        user = User.query.filter_by(email=email).first()

        if not user:
            user = User(
                name=name,
                email=email,
                auth_provider='google',
                avatar_url=picture,
            )
            db.session.add(user)
            db.session.commit()
            print(f'✅ New Google user created: {email}')
        else:
            # Update avatar and name from Google if changed
            user.avatar_url = picture
            if user.auth_provider != 'google':
                user.auth_provider = 'google'
            db.session.commit()

        # Issue JWT
        jwt_token = create_access_token(identity=str(user.user_id))

        # Redirect to frontend with token and user data
        user_json = json.dumps(user.to_dict())
        import urllib.parse
        encoded_user = urllib.parse.quote(user_json)

        return redirect(
            f'{frontend_url}/auth/callback?token={jwt_token}&user={encoded_user}'
        )

    except Exception as e:
        print(f'❌ Google OAuth error: {str(e)}')
        db.session.rollback()
        return redirect(f'{frontend_url}/login?error=server_error')


# ──────────────────────────────────────────────
# Demo / Local Login (kept for demo account)
# ──────────────────────────────────────────────

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user (demo account only)"""
    try:
        data = request.get_json()

        if not all(k in data for k in ['email', 'password']):
            return jsonify({'message': 'Email and password are required'}), 400

        email = data['email'].strip().lower()
        password = data['password']

        # Find user
        user = User.query.filter_by(email=email).first()

        if not user or not user.password_hash or not user.check_password(password):
            return jsonify({'message': 'Invalid email or password'}), 401

        # Create access token
        access_token = create_access_token(identity=str(user.user_id))

        return jsonify({
            'message': 'Login successful',
            'token': access_token,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'message': f'Login failed: {str(e)}'}), 500


# ──────────────────────────────────────────────
# Token Verification
# ──────────────────────────────────────────────

@auth_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify():
    """Verify JWT token"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'valid': False, 'message': 'User not found'}), 404

        return jsonify({
            'valid': True,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'valid': False, 'message': str(e)}), 401


# ──────────────────────────────────────────────
# Profile Management
# ──────────────────────────────────────────────

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'message': 'User not found'}), 404

        data = request.get_json()

        # Update name
        if 'name' in data:
            name = data['name'].strip()
            if len(name) < 2:
                return jsonify({'message': 'Name must be at least 2 characters'}), 400
            user.name = name

        # Update profile picture base64 string
        if 'profile_picture' in data:
            user.profile_picture = data['profile_picture']

        # Update notification preferences
        if 'email_notifications' in data:
            user.email_notifications = bool(data['email_notifications'])

        if 'push_notifications' in data:
            user.push_notifications = bool(data['push_notifications'])

        if 'task_reminders' in data:
            user.task_reminders = bool(data['task_reminders'])

        if 'focus_sounds' in data:
            user.focus_sounds = bool(data['focus_sounds'])

        if 'voice_feedback' in data:
            user.voice_feedback = bool(data['voice_feedback'])

        # Update appearance preferences
        if 'theme' in data:
            user.theme = data['theme']

        if 'language' in data:
            user.language = data['language']

        db.session.commit()

        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update profile: {str(e)}'}), 500


@auth_bp.route('/account', methods=['DELETE'])
@jwt_required()
def delete_account():
    """Delete user account and all associated data"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'message': 'User not found'}), 404

        # Delete user (SQLAlchemy cascade will handle tasks, timers, reminders)
        db.session.delete(user)
        db.session.commit()

        return jsonify({'message': 'Account successfully deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete account: {str(e)}'}), 500
