# 🎤 VoicePro Backend API

Complete Flask backend for VoicePro - AI-Powered Voice Productivity Assistant.

## 🌟 Features

### ✅ Complete API Implementation
- **Authentication** - JWT-based auth with password reset
- **Tasks Management** - CRUD operations for tasks
- **Timer System** - Pomodoro & manual timers
- **Voice Processing** - Audio transcription & command parsing
- **Analytics** - Productivity insights & reports

### 🔒 Production-Ready
- JWT authentication
- Password hashing (bcrypt)
- Rate limiting
- CORS configuration
- Input validation
- Error handling
- SQLite (dev) / MySQL (prod) support

---

## 📋 Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Virtual environment (recommended)

---

## 🚀 Quick Start (3 Steps)

### 1. Install Dependencies
```bash
cd voicepro-backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install packages
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
# Copy example env file
cp .env.example .env

# Edit .env file and set your values
# At minimum, change SECRET_KEY and JWT_SECRET_KEY
```

### 3. Run the Server
```bash
python app.py
```

**Server runs at:** `http://localhost:5000`

---

## 📁 Project Structure

```
voicepro-backend/
├── app.py                  # Main application
├── config.py              # Configuration
├── models.py              # Database models
├── requirements.txt       # Dependencies
├── .env.example          # Environment template
├── routes/
│   ├── auth.py           # Authentication endpoints
│   ├── tasks.py          # Task management endpoints
│   ├── timers.py         # Timer endpoints
│   ├── voice.py          # Voice processing endpoints
│   └── analytics.py      # Analytics endpoints
└── uploads/              # Temporary audio files (auto-created)
```

---

## 🔌 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/signup` | Register new user | No |
| POST | `/login` | Login user | No |
| GET | `/verify` | Verify JWT token | Yes |
| POST | `/forgot-password` | Request password reset | No |
| POST | `/reset-password` | Reset password with token | No |
| PUT | `/profile` | Update user profile | Yes |

### Tasks (`/api/tasks`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all tasks | Yes |
| GET | `/:id` | Get specific task | Yes |
| POST | `/` | Create new task | Yes |
| PUT | `/:id` | Update task | Yes |
| DELETE | `/:id` | Delete task | Yes |
| PATCH | `/:id/complete` | Mark task complete | Yes |

### Timers (`/api/timers`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/start` | Start timer | Yes |
| POST | `/:id/stop` | Stop timer | Yes |
| GET | `/active` | Get active timer | Yes |
| GET | `/summary/today` | Get today's summary | Yes |
| GET | `/history` | Get timer history | Yes |

### Voice (`/api/voice`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/transcribe` | Transcribe audio to text | Yes |
| POST | `/command` | Process voice command | Yes |

### Analytics (`/api/analytics`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/insights` | Get productivity insights | Yes |
| GET | `/time-breakdown` | Get time breakdown | Yes |
| GET | `/weekly-report` | Get weekly report | Yes |

### System

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/health` | Health check | No |
| GET | `/` | API info | No |

---

## 📝 API Usage Examples

### 1. Register User
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**Response:**
```json
{
  "message": "User created successfully",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2024-02-21T10:00:00"
  }
}
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

### 3. Create Task (with token)
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Design mockups",
    "description": "Create UI mockups for dashboard",
    "priority": "high",
    "duration": 120
  }'
```

### 4. Start Timer
```bash
curl -X POST http://localhost:5000/api/timers/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "type": "pomodoro",
    "duration": 25
  }'
```

### 5. Get Today's Summary
```bash
curl -X GET http://localhost:5000/api/timers/summary/today \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🗄️ Database Schema

### Users
```sql
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tasks
```sql
CREATE TABLE tasks (
    task_id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    duration INTEGER,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);
```

### Timers
```sql
CREATE TABLE timers (
    timer_id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    task_id INTEGER,
    type VARCHAR(20) DEFAULT 'manual',
    duration_minutes INTEGER NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users (user_id),
    FOREIGN KEY (task_id) REFERENCES tasks (task_id)
);
```

### Reminders
```sql
CREATE TABLE reminders (
    reminder_id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    task_id INTEGER,
    message VARCHAR(500) NOT NULL,
    reminder_time TIMESTAMP NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);
```

---

## 🔧 Configuration

### Environment Variables

Create `.env` file with:

```bash
# Required
SECRET_KEY=your-unique-secret-key-here
JWT_SECRET_KEY=your-unique-jwt-secret-here
DATABASE_URL=sqlite:///voicepro.db

# Optional
CORS_ORIGINS=http://localhost:3000
DEBUG=True
FLASK_ENV=development
```

### Database Options

**SQLite (Development - Default):**
```bash
DATABASE_URL=sqlite:///voicepro.db
```

**MySQL (Production):**
```bash
DATABASE_URL=mysql+pymysql://username:password@localhost/voicepro
```

---

## 🎤 Voice Processing

### Basic Transcription
Uses `SpeechRecognition` library with Google Speech API (free tier).

**Supported formats:**
- WAV
- MP3
- WEBM
- OGG
- M4A

### Advanced Setup (Optional)

For production-grade transcription with Google Cloud Speech-to-Text:

1. Create Google Cloud project
2. Enable Speech-to-Text API
3. Create service account credentials
4. Download JSON key file
5. Set environment variable:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

---

## 🚀 Deployment

### Option 1: Heroku

```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create voicepro-api

# Set environment variables
heroku config:set SECRET_KEY=your-secret-key
heroku config:set JWT_SECRET_KEY=your-jwt-key
heroku config:set DATABASE_URL=your-postgres-url

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

### Option 2: Docker

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:create_app()"]
```

```bash
docker build -t voicepro-backend .
docker run -p 5000:5000 voicepro-backend
```

### Option 3: VPS (DigitalOcean, AWS, etc.)

```bash
# On server
git clone your-repo
cd voicepro-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment
nano .env

# Run with gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

---

## 🧪 Testing

### Test with cURL

```bash
# Health check
curl http://localhost:5000/api/health

# Test signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"Test1234"}'
```

### Test with Postman

Import the endpoints and test each one.

---

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:5000 | xargs kill -9
```

### Database errors
```bash
# Delete database and recreate
rm voicepro.db
python app.py  # Tables will be created automatically
```

### Module not found
```bash
# Ensure virtual environment is activated
# Reinstall requirements
pip install -r requirements.txt
```

### CORS errors
Check `.env` file:
```bash
CORS_ORIGINS=http://localhost:3000
```

---

## 📊 Production Checklist

- [ ] Change SECRET_KEY and JWT_SECRET_KEY
- [ ] Set DEBUG=False
- [ ] Use production database (MySQL/PostgreSQL)
- [ ] Configure proper CORS origins
- [ ] Set up email server for password reset
- [ ] Enable HTTPS
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Configure rate limiting properly
- [ ] Add logging
- [ ] Set up database backups

---

## 🔐 Security Best Practices

- ✅ Passwords hashed with bcrypt
- ✅ JWT token-based authentication
- ✅ Rate limiting enabled
- ✅ Input validation on all endpoints
- ✅ CORS configured
- ✅ SQL injection protection (SQLAlchemy ORM)
- ✅ XSS protection (JSON responses)

**Additional recommendations:**
- Use HTTPS in production
- Regular security audits
- Keep dependencies updated
- Enable API monitoring
- Implement request logging

---

## 📚 Dependencies

- **Flask** - Web framework
- **Flask-SQLAlchemy** - Database ORM
- **Flask-JWT-Extended** - JWT authentication
- **Flask-Bcrypt** - Password hashing
- **Flask-CORS** - CORS handling
- **Flask-Limiter** - Rate limiting
- **SpeechRecognition** - Voice transcription

---

## 🤝 Integration with Frontend

Your React frontend is already configured to call these endpoints!

Just make sure:
1. Backend is running on `http://localhost:5000`
2. Frontend `.env` has: `REACT_APP_API_URL=http://localhost:5000/api`
3. CORS is configured to allow your frontend origin

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review error logs
3. Verify environment variables
4. Check database connection

---

**Your backend is production-ready! 🎉**

Start the server and connect your frontend to bring VoicePro to life!
