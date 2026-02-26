# Ketch ✏️
**Where Sketching meets Texting.**

Ketch is a full-stack, real-time collaborative whiteboard application built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.io. It combines an infinite canvas, live video conferencing, in-room chat, and host controls into a single seamless studio.

## 🎨 Designed & Developed By
**Nabajyoti Kalita** (Lead Developer & Designer)

---

## 🚀 Features

### 🖼️ Canvas & Drawing Tools
- **Freehand Pencil** with adjustable brush size (slider) and stroke color picker
- **Shape Tools**: Rectangle, Circle, Triangle, Arrow, Line — with optional fill color
- **Fill Bucket**: Flood-fill enclosed shapes with a chosen color
- **Text Tool**: Click anywhere to place text on the canvas
- **Eraser**: Variable-size eraser for precise corrections
- **Undo / Redo**: Full history navigation within a session
- **Clear Board**: Wipe the canvas in one click
- **Save as Image**: Export the whiteboard as a PNG file
- **Persistent Canvas**: All drawings are saved to MongoDB and restored when you re-enter a room

### 🎥 Video Conferencing
- **Camera Sharing**: Share your webcam feed; all participants see it in real time
- **Screen Sharing**: Broadcast your screen to the whole room mid-session
- **Dual Feed View**: When sharing both camera and screen, feeds stack in a compact panel with tap-to-enlarge
- **Live Participant Count**: Accurate online-user counter that updates as members join & leave

### 👥 Room & Collaboration
- **Room-Based Sessions**: Create or join rooms with unique IDs
- **Real-Time Drawing Sync**: Every stroke appears instantly for all users via WebSockets
- **In-Room Chat**: Real-time messaging with all room members
- **User Presence**: Live indicator of online participants
- **Host / Admin Controls**: Approve or reject join requests; kick disruptive participants

### 🔐 Authentication & UX
- **JWT Auth**: Secure Register / Login / Logout
- **Protected Routes**: Dashboard and whiteboard rooms require authentication
- **Landing Page**: Animated hero page with feature showcase, canvas preview, and call-to-action
- **Dark Mode**: Global theme toggle — all UI elements and the canvas adapt automatically
- **Responsive UI**: Modern fluid design using React Hooks and Vanilla CSS

---

## 🛠️ Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React (Vite), React Router, Socket.io-client, Axios, Lucide-React |
| **Backend** | Node.js, Express 5, Socket.io |
| **Auth** | JWT (jsonwebtoken), BcryptJS |
| **Database** | MongoDB Atlas (Mongoose) |
| **Styling** | Vanilla CSS (custom design system, CSS variables, dark mode) |

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18+) installed
- MongoDB Atlas account and connection URI

### 1. Backend Setup
```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secret_key
```

Start the server:
```bash
npm run dev
# or: node index.js
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure
```
Ketch/
├── client/                  # React (Vite) frontend
│   └── src/
│       ├── components/
│       │   ├── Canvas.jsx       # Drawing engine, all tools & socket sync
│       │   ├── Chat.jsx         # In-room real-time chat
│       │   ├── VideoGrid.jsx    # Video/screen-share grid & WebRTC
│       │   └── Navbar.jsx       # App-wide navigation bar
│       ├── pages/
│       │   ├── LandingPage.jsx  # Public landing page with animated hero
│       │   ├── Login.jsx        # Login form
│       │   ├── Register.jsx     # Registration form
│       │   ├── Dashboard.jsx    # Room list, create/join rooms
│       │   └── Whiteboard.jsx   # Full studio: canvas + chat + video
│       └── context/
│           └── AuthContext.jsx  # Global auth state (JWT)
└── server/                  # Node.js / Express backend
    ├── index.js             # Express app + Socket.io event handlers
    ├── config/              # MongoDB connection
    ├── models/
    │   ├── User.js          # User schema
    │   └── Room.js          # Room & canvas-data schema
    ├── routes/
    │   ├── auth.js          # Register / Login endpoints
    │   └── rooms.js         # Room CRUD endpoints
    └── middleware/
        └── auth.js          # JWT verification middleware
```

---

## 📜 License
This project was built for academic / personal purposes.
