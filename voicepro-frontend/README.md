# VoicePro Frontend

A modern, voice-powered productivity assistant built with React. Features include voice commands for task management, time tracking, and productivity analytics.

## 🎨 Design Features

- **Distinctive Design**: Warm color palette with energetic gradients
- **Modern Typography**: Custom font stack with Outfit and Space Mono
- **Smooth Animations**: Framer Motion for delightful interactions
- **Glassmorphism Effects**: Backdrop blur and transparency
- **Responsive Layout**: Mobile-first design that works on all devices

## 🚀 Tech Stack

- **React 18** - UI framework
- **React Router** - Navigation
- **Framer Motion** - Animations
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **Context API** - State management

## 📦 Installation

1. **Install Dependencies**
```bash
cd voicepro-frontend
npm install
```

2. **Set Environment Variables**
Create a `.env` file in the root directory:
```
REACT_APP_API_URL=http://localhost:5000/api
```

3. **Start Development Server**
```bash
npm start
```

The app will open at `http://localhost:3000`

## 🏗️ Project Structure

```
src/
├── components/
│   ├── Dashboard.jsx          # Main dashboard with stats
│   ├── VoiceAssistant.jsx     # Voice recording component
│   ├── TasksPage.jsx          # Kanban-style task board
│   ├── TimerPage.jsx          # Pomodoro & manual timers
│   └── AnalyticsPage.jsx      # Productivity insights
├── contexts/
│   └── AppContext.jsx         # Global state management
├── hooks/
│   └── useVoice.js            # Voice recording hook
├── services/
│   └── api.js                 # API service layer
├── styles/
│   └── App.css                # Global styles & design system
└── App.jsx                    # Main app with routing
```

## 🎤 Voice Commands

Try these voice commands:

- **"Log 30 minutes for design work"** - Create a task with time
- **"Start a pomodoro timer"** - Begin 25-minute focus session
- **"What did I complete today?"** - Get daily summary
- **"Remind me in 25 minutes"** - Set a reminder

## 🎨 Design System

### Color Palette
- **Primary**: `#FF6B35` (Warm Orange)
- **Secondary**: `#4ECDC4` (Teal)
- **Accent**: `#FFD23F` (Yellow)
- **Background**: `#0F1419` (Dark Blue)

### Typography
- **Display**: Outfit (sans-serif)
- **Monospace**: Space Mono

### Components
All components use a consistent design system with:
- Glassmorphism cards
- Smooth hover animations
- Gradient accents
- Responsive layouts

## 🔧 Configuration

### API Integration
Update the API URL in `.env` to point to your backend:
```
REACT_APP_API_URL=https://your-backend.com/api
```

### Voice Settings
The app uses the browser's Web Audio API for voice recording. Make sure to:
- Grant microphone permissions when prompted
- Use HTTPS in production (required for microphone access)
- Test on Chrome or Edge for best compatibility

## 📱 Browser Support

- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

**Note**: Voice recording requires HTTPS except on localhost.

## 🚢 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Deploy to Netlify
1. Connect your Git repository
2. Build command: `npm run build`
3. Publish directory: `build`

## 🎯 Features

### Dashboard
- Real-time stats overview
- Voice assistant integration
- Recent tasks display
- Quick action buttons

### Tasks
- Kanban-style board (To Do, In Progress, Completed)
- Voice-based task creation
- Drag-and-drop (coming soon)
- Task completion tracking

### Timer
- Pomodoro timer (25 minutes)
- Custom manual timer
- Visual progress ring
- Daily time summary

### Analytics
- Weekly activity chart
- Category breakdown
- Productivity tips
- Performance insights

## 🐛 Troubleshooting

### Voice Recording Not Working
1. Check microphone permissions in browser settings
2. Ensure you're using HTTPS (or localhost)
3. Try a different browser
4. Check browser console for errors

### Backend Connection Issues
1. Verify API URL in `.env` file
2. Check CORS settings on backend
3. Ensure backend is running
4. Check browser network tab for errors

### Build Errors
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Clear cache: `npm cache clean --force`
4. Try with Node.js LTS version

## 📝 Development Tips

### Hot Reload
Changes to components will automatically reload. CSS changes are instant.

### Component Testing
Each component is self-contained with its own CSS file for easy testing.

### State Management
The app uses Context API for global state. To add new state:
1. Update `AppContext.jsx`
2. Access via `useApp()` hook in components

### API Calls
All API calls go through `services/api.js`. Add new endpoints there.

## 🤝 Contributing

This is a college project, but suggestions are welcome!

## 📄 License

MIT License - free to use for learning purposes.

## 🙏 Acknowledgments

- Design inspired by modern productivity apps
- Icons from Unicode Emoji
- Fonts from Google Fonts
- Charts from Recharts library

---

**Built with ❤️ by Rida Kamil Nakhuda**

For backend setup, see the implementation guide document.
