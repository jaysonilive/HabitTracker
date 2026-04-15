# 🎯 HabitTracker

A modern, real-time habit tracking web app built with React, TypeScript, Firebase, and Tailwind CSS. Installable as a desktop/mobile app (PWA) with instant cross-device sync.

🌐 **Live App:** [habittracker-27395.web.app](https://habittracker-27395.web.app)

---

## ✨ Features

- **📋 Daily Habit Tracker** — Track up to 12+ habits across the full month in a spreadsheet-style grid
- **🔥 Streaks** — Current streak and best streak calculated accurately from today backwards
- **📊 Overview Dashboard** — Completion rate, active habits count, average sleep, and activity bar chart
- **🌙 Sleep Tracker** — Visual dot-connect graph for logging and visualizing sleep hours
- **📝 Journal** — Monthly notes/diary with auto-save debouncing
- **🔄 Real-time Sync** — Changes on one device appear on all other devices within 1–2 seconds
- **📱 PWA — Installable** — Install as a native-feeling desktop or mobile app (no app store needed)
- **🔐 Google Auth** — Sign in with Google, data is private per user
- **⚡ Fast Loading** — IndexedDB persistent cache for near-instant loads on return visits

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| Backend/DB | Firebase Firestore |
| Auth | Firebase Authentication (Google) |
| Hosting | Firebase Hosting |
| Build Tool | Vite |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project with Firestore and Google Auth enabled

### Installation

```bash
# Clone the repo
git clone https://github.com/jaysonilive/HabitTracker.git
cd HabitTracker

# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file (see `.env.example`):
```
GEMINI_API_KEY=your_gemini_api_key_here
```

Update `firebase-applet-config.json` with your Firebase project credentials:
```json
{
  "apiKey": "your-api-key",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "appId": "your-app-id",
  "firestoreDatabaseId": "(default)"
}
```

### Running Locally

```bash
npm run dev
```

App runs at `http://localhost:3000`

---

## 📦 Deployment

### Deploy to Firebase Hosting

```bash
# Build production bundle
npm run build

# Deploy
firebase deploy --only hosting
```

The app will be live at `https://your-project-id.web.app`

### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

---

## 📱 Installing as a Desktop / Mobile App (PWA)

1. Open the live URL in **Chrome or Edge**
2. Look for the **install icon** in the address bar (or the in-app install prompt)
3. Click **Install**
4. The app appears in your **Start Menu / Home Screen** and opens like a native app

> No app store required. Works on Windows, Android, and iOS (Safari).

---

## 🗂️ Project Structure

```
HabitTracker/
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker (offline + caching)
│   ├── icon-192.png        # App icons
│   └── icon-512.png
├── src/
│   ├── components/
│   │   ├── HabitTracker.tsx  # Main tracker UI
│   │   ├── Auth.tsx          # Login screen
│   │   └── LoadingScreen.tsx # Animated loading screen
│   ├── lib/
│   │   └── utils.ts          # Utility functions
│   ├── firebase.ts           # Firebase initialization
│   ├── App.tsx               # Root component
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles
├── firebase.json             # Firebase Hosting config
├── firestore.rules           # Firestore security rules
├── firebase-blueprint.json   # Firestore schema reference
└── vite.config.ts            # Vite configuration
```

---

## 🔐 Firestore Security Rules

Data is completely private — each user can only read and write their own data:

```
/users/{userId}/dashboards/{monthYear}
  allow read, write: if request.auth.uid == userId
```

---

## 📅 Data Model

```typescript
interface DashboardData {
  uid: string;           // Firebase Auth UID
  monthYear: string;     // "YYYY-MM" format
  habits: string[];      // List of habit names
  completions: {         // Map of "habitIndex-day" → boolean
    [key: string]: boolean;
  };
  sleep: {               // Map of day → sleep hours string
    [day: number]: string;
  };
  notes: string;         // Monthly journal text
}
```

---

## 🧠 Key Implementation Notes

- **Real-time sync** uses Firestore `onSnapshot` listeners — no polling needed
- **Cache safety** — `snapshot.metadata.fromCache` is checked before creating new documents to prevent stale cache from wiping real data
- **Writes use `setDoc` with `merge: true`** — idempotent, never fails due to missing document
- **Notes are debounced** (1 second) to avoid excessive Firestore writes on every keystroke
- **Streak logic** counts backwards from today with a grace period if today hasn't been logged yet

---

## 👤 Author

**Jayson** — [jaysonilive@gmail.com](mailto:jaysonilive@gmail.com)

---

## 📄 License

MIT License — feel free to fork and build your own habit tracker!
