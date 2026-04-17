# 🚀 VoicePro Backend - 30 Second Setup

## Quick Start (3 Commands)

```bash
# 1. Run setup script
bash setup.sh

# 2. Activate virtual environment
source venv/bin/activate

# 3. Start server
python app.py
```

**That's it!** Server runs at `http://localhost:5000`

---

## Test It Works

```bash
# In another terminal
python test_api.py
```

---

## Connect Frontend

Update frontend `.env`:
```bash
REACT_APP_API_URL=http://localhost:5000/api
```

Then start your React frontend:
```bash
cd ../voicepro-frontend
npm start
```

---

## Default Users

### Demo Account
- Email: `test@example.com`
- Password: `Test1234`

Or create your own via signup endpoint!

---

## API Documentation

**Full docs:** See `README.md`

**Quick endpoints:**
- Health: `GET /api/health`
- Signup: `POST /api/auth/signup`
- Login: `POST /api/auth/login`
- Tasks: `GET /api/tasks`
- Timers: `POST /api/timers/start`

---

## Troubleshooting

### Port 5000 in use?
```bash
# Kill process
lsof -ti:5000 | xargs kill -9
# Or change port in app.py
```

### Dependencies fail to install?
```bash
# Upgrade pip
pip install --upgrade pip
# Try again
pip install -r requirements.txt
```

### Database issues?
```bash
# Delete and recreate
rm voicepro.db
python app.py
```

---

**You're ready! Start building! 🎉**
