const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // In production, replace with client URL
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));

// Basic Route
app.get('/', (req, res) => {
    res.send('Ketch Server is running...');
});

// Socket.io Logic
const usersInRooms = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', ({ roomId, username }) => {
        socket.join(roomId);

        if (!usersInRooms[roomId]) {
            usersInRooms[roomId] = [];
        }

        // Add user to room if not already there
        if (!usersInRooms[roomId].find(u => u.id === socket.id)) {
            usersInRooms[roomId].push({ id: socket.id, username });
        }

        io.to(roomId).emit('update-users', usersInRooms[roomId]);
        console.log(`User ${username} (${socket.id}) joined room: ${roomId}`);
    });

    socket.on('draw', (data) => {
        socket.to(data.roomId).emit('draw', data);
    });

    socket.on('clear', (roomId) => {
        io.to(roomId).emit('clear');
    });

    socket.on('send-message', (data) => {
        socket.to(data.roomId).emit('receive-message', data);
    });

    socket.on('disconnect', () => {
        // Find and remove user from all rooms
        for (const roomId in usersInRooms) {
            const index = usersInRooms[roomId].findIndex(u => u.id === socket.id);
            if (index !== -1) {
                usersInRooms[roomId].splice(index, 1);
                io.to(roomId).emit('update-users', usersInRooms[roomId]);
            }
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
