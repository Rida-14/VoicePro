# 🎙️ VoicePro — AI-Powered Productivity Suite

VoicePro is a full-stack productivity application that combines task management, deep-work timers, calendar scheduling, analytics, and an AI voice assistant — all in one beautiful interface.

## ✨ Features

- **Voice-Powered AI Assistant** — Natural language task creation, scheduling, and focus session management
- **Smart Task Management** — Priority-based tasks with due dates, categories, and estimated durations
- **Deep-Work Timer** — Pomodoro-style focus timer with ambient sounds
- **Calendar Integration** — Visual calendar with drag-and-drop task scheduling
- **Analytics Dashboard** — Charts for focus time trends, task completion, activity heatmaps, and burndown
- **Google OAuth** — Secure authentication with Google sign-in

## 🛠️ Tech Stack

| Layer     | Technology                         |
|-----------|------------------------------------|
| Frontend  | React, Framer Motion, Recharts     |
| Backend   | Flask, SQLAlchemy, Flask-JWT       |
| Database  | SQLite (dev) / PostgreSQL (prod)   |
| AI        | OpenAI GPT-4o-mini                 |
| Auth      | Google OAuth 2.0, JWT              |

## 📂 Project Structure

```
voicepro/
├── voicepro-frontend/     # React SPA
│   ├── src/
│   │   ├── components/    # Pages & UI components
│   │   ├── contexts/      # Auth & theme context
│   │   └── services/      # API client
│   └── public/
├── voicepro-backend/      # Flask REST API
│   ├── routes/            # API route blueprints
│   ├── models.py          # SQLAlchemy models
│   ├── config.py          # App configuration
│   └── app.py             # Entry point
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 16
- **Python** ≥ 3.9
- **npm** or **yarn**

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/voicepro.git
cd voicepro
```

### 2. Set up the backend

```bash
cd voicepro-backend
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate          # Windows

pip install -r requirements.txt
cp .env.example .env            # then fill in your API keys
python app.py
```

The backend will start on `http://localhost:5000`.

### 3. Set up the frontend

```bash
cd voicepro-frontend
npm install
cp .env.example .env            # set your API URL
npm start
```

The frontend will start on `http://localhost:3000`.

## 🔑 Environment Variables

### Backend (`voicepro-backend/.env`)

| Variable               | Description                     |
|------------------------|---------------------------------|
| `OPENAI_API_KEY`       | OpenAI API key for AI assistant |
| `OPENAI_MODEL`         | Model name (e.g. `gpt-4o-mini`)|
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID          |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret      |
| `GOOGLE_REDIRECT_URI`  | OAuth callback URL              |
| `SECRET_KEY`           | Flask session secret            |

### Frontend (`voicepro-frontend/.env`)

| Variable              | Description            |
|-----------------------|------------------------|
| `REACT_APP_API_URL`   | Backend API base URL   |

## 📄 License

This project was built as a final-year academic project.

---

Made with ❤️ by Rida
