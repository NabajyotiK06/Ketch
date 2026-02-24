**Ketch: Where Sketching meets Texting.**

Ketch is a full-stack, real-time collaborative whiteboard application built using the MERN stack (MongoDB, Express, React, Node.js) and Socket.io.

## 🎨 Designed & Developed By
**Nabajyoti Kalita** (Lead Developer & Designer)

---

## 🚀 Features

### Core Requirements
- **User Authentication**: JWT-based Register / Login / Logout.
- **Room-Based Collaboration**: Create or join shared rooms with unique IDs.
- **Real-Time Synchronization**: Drawing updates instantly for all users using WebSockets.
- **Canvas Tools**: Pencil, Eraser, Clear Board.
- **Customization**: Color picker and brush size selection.
- **In-Room Chat**: Real-time messaging with room members.
- **Persistent Storage**: Whiteboard sessions (canvas data) stored in MongoDB Atlas.

### Intermediate Features
- **Undo / Redo**: Navigate through drawing history in the current session.
- **Save as Image**: Download the whiteboard as a PNG file.
- **User Presence**: Live indicator of online participants in the room.
- **Protected Routes**: Secure access to the dashboard and whiteboard rooms.
- **Responsive UI**: Modern, fluid design using React Hooks and Vanilla CSS.

---

## 🛠️ Technology Stack
- **Frontend**: React (Vite), Socket.io-client, Lucide-React, Axios, React Router.
- **Backend**: Node.js, Express, Socket.io, JWT, BcryptJS.
- **Database**: MongoDB Atlas.

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js installed.
- MongoDB Atlas account and connection URI.

### 1. Backend Setup
```bash
cd server
npm install
```
- Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secret_key
```
- Start the server:
```bash
node index.js
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```
- Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure
```
Ketch/
├── client/          # React (Vite) frontend
│   ├── src/
│   │   ├── components/  # Canvas, Chat, Navbar
│   │   ├── pages/       # Login, Register, Dashboard, Whiteboard
│   │   └── context/     # AuthContext
└── server/          # Node.js Express backend
    ├── config/      # DB connection
    ├── models/      # User, Room schemas
    ├── routes/      # Auth, Room management
    └── middleware/  # JWT Auth
```

---

## 📜 License
This project was built for academic/personal purposes.
