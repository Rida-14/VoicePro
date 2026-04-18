from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from config import config
from models import db, bcrypt
import os

def create_app(config_name=None):
    """Application factory"""
    
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    CORS(app, resources={r"/api/*": {
        "origins": app.config['CORS_ORIGINS'],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type", "Authorization"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "supports_credentials": True
    }})
    
    # JWT
    jwt = JWTManager(app)
    
    # Rate limiting
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=[app.config['RATELIMIT_DEFAULT']],
        storage_uri=app.config['RATELIMIT_STORAGE_URL']
    )
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.tasks import tasks_bp
    from routes.timers import timers_bp
    from routes.voice import voice_bp
    from routes.analytics import analytics_bp
    from routes.reminders import reminders_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(timers_bp)
    app.register_blueprint(voice_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(reminders_bp)
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'message': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        print(f"❌ Token expired: {jwt_payload}")
        return jsonify({'message': 'Token has expired'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        print(f"❌ Invalid token: {error}")
        return jsonify({'message': 'Invalid token'}), 401
    
    @jwt.unauthorized_loader
    def unauthorized_callback(error):
        print(f"❌ Unauthorized (no token): {error}")
        return jsonify({'message': 'Authorization required'}), 401
    
    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'VoicePro API',
            'version': '1.0.0'
        }), 200
    
    # Root endpoint
    @app.route('/')
    def index():
        return jsonify({
            'message': 'Welcome to VoicePro API',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/api/auth',
                'tasks': '/api/tasks',
                'timers': '/api/timers',
                'voice': '/api/voice',
                'analytics': '/api/analytics',
                'reminders': '/api/reminders',
                'health': '/api/health'
            }
        }), 200
    
    # Create database tables
    with app.app_context():
        db.create_all()
        print("✓ Database tables created")
        
        # Create demo user if it doesn't exist
        from models import User
        demo_user = User.query.filter_by(email='demo@voicepro.com').first()
        if not demo_user:
            demo_user = User(
                name='Demo User',
                email='demo@voicepro.com'
            )
            demo_user.set_password('Demo1234')
            db.session.add(demo_user)
            db.session.commit()
            print("✓ Demo user created (email: demo@voicepro.com, password: Demo1234)")
            
            try:
                from seed_demo_data import seed_data
                seed_data()
            except Exception as e:
                print(f"Error seeding demo data: {e}")
    
    return app

if __name__ == '__main__':
    app = create_app()
    
    print("\n" + "="*60)
    print("🎤 VoicePro Backend Starting...")
    print("="*60)
    print(f"Environment: {os.getenv('FLASK_ENV', 'development')}")
    print(f"Database: {app.config['SQLALCHEMY_DATABASE_URI']}")
    print(f"CORS Origins: {app.config['CORS_ORIGINS']}")
    print("="*60 + "\n")
    
    # Run the app
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=app.config['DEBUG']
    )
