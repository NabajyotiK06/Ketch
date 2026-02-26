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
const usersInRooms = {};   // { roomId: [{ id, username }] }
const bannedUsers = {};    // { roomId: [username] }
const pendingUsers = {};   // { roomId: [{ id, username }] }  — waiting for host approval
const roomHosts = {};      // { roomId: socketId }             — first joiner is host
const roomShapes = {};     // { roomId: [shape, ...] }         — authoritative shape list

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // ── Join Room ─────────────────────────────────────────
    socket.on('join-room', ({ roomId, username }) => {
        if (bannedUsers[roomId] && bannedUsers[roomId].includes(username)) {
            socket.emit('banned-error');
            return;
        }

        if (!usersInRooms[roomId]) usersInRooms[roomId] = [];
        if (!pendingUsers[roomId]) pendingUsers[roomId] = [];

        const isFirstUser = usersInRooms[roomId].length === 0 && pendingUsers[roomId].length === 0;

        if (isFirstUser) {
            // First user → immediately admitted as host
            roomHosts[roomId] = socket.id;
            if (!roomShapes[roomId]) roomShapes[roomId] = [];
            socket.join(roomId);
            usersInRooms[roomId].push({ id: socket.id, username });
            io.to(roomId).emit('update-users', usersInRooms[roomId]);
            socket.emit('join-approved');
            socket.emit('you-are-host');
            // Send existing shapes (may have been loaded before if room was active)
            socket.emit('sync-shapes', { shapes: roomShapes[roomId] });
            console.log(`[HOST] ${username} (${socket.id}) created room: ${roomId}`);
        } else {
            // Subsequent users → check if already in room (reconnect)
            const existingIndex = usersInRooms[roomId].findIndex(u => u.username === username);
            if (existingIndex !== -1) {
                // Reconnect — update socket id, admit directly
                usersInRooms[roomId][existingIndex].id = socket.id;
                socket.join(roomId);
                io.to(roomId).emit('update-users', usersInRooms[roomId]);
                socket.emit('join-approved');
                socket.emit('sync-shapes', { shapes: roomShapes[roomId] || [] });
                console.log(`[RECONNECT] ${username} (${socket.id}) re-joined: ${roomId}`);
            } else {
                // New user — put in waiting room, notify host
                pendingUsers[roomId].push({ id: socket.id, username });
                socket.emit('join-pending'); // waitingroom UI for this user
                const hostSocketId = roomHosts[roomId];
                if (hostSocketId) {
                    io.to(hostSocketId).emit('join-request', { socketId: socket.id, username });
                } else {
                    // No host online — admit automatically
                    pendingUsers[roomId] = pendingUsers[roomId].filter(u => u.id !== socket.id);
                    socket.join(roomId);
                    usersInRooms[roomId].push({ id: socket.id, username });
                    io.to(roomId).emit('update-users', usersInRooms[roomId]);
                    socket.emit('join-approved');
                    socket.emit('sync-shapes', { shapes: roomShapes[roomId] || [] });
                }
                console.log(`[PENDING] ${username} (${socket.id}) waiting for approval in: ${roomId}`);
            }
        }
    });

    // ── Admin: Accept pending user ────────────────────────
    socket.on('accept-user', ({ roomId, socketId }) => {
        const pendingList = pendingUsers[roomId] || [];
        const userIndex = pendingList.findIndex(u => u.id === socketId);
        if (userIndex === -1) return;

        const user = pendingList[userIndex];
        pendingUsers[roomId].splice(userIndex, 1);

        // Admit them
        const targetSocket = io.sockets.sockets.get(socketId);
        if (targetSocket) {
            targetSocket.join(roomId);
            usersInRooms[roomId].push({ id: socketId, username: user.username });
            io.to(roomId).emit('update-users', usersInRooms[roomId]);
            io.to(socketId).emit('join-approved');
            // Send current shapes to the newly admitted user
            io.to(socketId).emit('sync-shapes', { shapes: roomShapes[roomId] || [] });
            // Notify existing room members so they can send WebRTC offers to the new user
            socket.to(roomId).emit('user-joined-room', { socketId, username: user.username });
            // Ask all existing members to re-broadcast their camera/screen state to the new user
            socket.to(roomId).emit('media-status-request', { newUserSocketId: socketId });

        }
        // Tell admin the pending list updated
        socket.emit('pending-update', pendingUsers[roomId] || []);
        console.log(`[ACCEPT] ${user.username} admitted to ${roomId}`);
    });

    // ── Admin: Reject pending user ────────────────────────
    socket.on('reject-user', ({ roomId, socketId }) => {
        const pendingList = pendingUsers[roomId] || [];
        pendingUsers[roomId] = pendingList.filter(u => u.id !== socketId);
        io.to(socketId).emit('join-rejected');
        socket.emit('pending-update', pendingUsers[roomId] || []);
        console.log(`[REJECT] socket ${socketId} rejected from ${roomId}`);
    });

    // ── Drawing Events ────────────────────────────────────
    socket.on('draw', (data) => {
        socket.to(data.roomId).emit('draw', data);
    });

    socket.on('draw-text', (data) => {
        socket.to(data.roomId).emit('draw-text', data);
    });

    // Real-time drawing movement (pencil strokes + shape previews while dragging)
    socket.on('draw-move', (data) => {
        socket.to(data.roomId).emit('draw-move', data);
    });

    socket.on('clear', (roomId) => {
        roomShapes[roomId] = [];
        io.to(roomId).emit('clear');
    });

    socket.on('add-shape', (data) => {
        if (!roomShapes[data.roomId]) roomShapes[data.roomId] = [];
        roomShapes[data.roomId].push(data.shape);
        socket.to(data.roomId).emit('add-shape', data.shape);
    });

    socket.on('delete-shape', (data) => {
        if (roomShapes[data.roomId]) {
            roomShapes[data.roomId] = roomShapes[data.roomId].filter(s => s.id !== data.id);
        }
        socket.to(data.roomId).emit('delete-shape', data.id);
    });

    socket.on('move-shape', (data) => {
        // Apply delta to server's authoritative shape list
        if (roomShapes[data.roomId]) {
            const shape = roomShapes[data.roomId].find(s => s.id === data.id);
            if (shape && data.dx !== 0 || data.dy !== 0) {
                if (shape) {
                    if (shape.type === 'pencil') {
                        shape.points = shape.points.map(p => ({ x: p.x + (data.dx || 0), y: p.y + (data.dy || 0) }));
                    } else {
                        shape.x1 = (shape.x1 || 0) + (data.dx || 0);
                        shape.y1 = (shape.y1 || 0) + (data.dy || 0);
                        if (shape.x2 !== undefined) shape.x2 += (data.dx || 0);
                        if (shape.y2 !== undefined) shape.y2 += (data.dy || 0);
                    }
                }
            }
        }
        socket.to(data.roomId).emit('move-shape', { id: data.id, dx: data.dx, dy: data.dy });
    });

    // update-shape: shape properties changed (e.g. image resize)
    socket.on('update-shape', (data) => {
        if (roomShapes[data.roomId]) {
            const idx = roomShapes[data.roomId].findIndex(s => s.id === data.shape.id);
            if (idx !== -1) {
                // Preserve any server-side properties, update with client data
                roomShapes[data.roomId][idx] = { ...roomShapes[data.roomId][idx], ...data.shape };
            }
        }
        socket.to(data.roomId).emit('update-shape', data.shape);
    });


    // ── Chat ──────────────────────────────────────────────
    socket.on('send-message', (data) => {
        socket.to(data.roomId).emit('receive-message', data);
    });

    socket.on('send-file', (data) => {
        socket.to(data.roomId).emit('receive-file', data);
    });

    // ── Canvas Save Notification (clears in-memory shapes so new
    //    joiners don't double-draw shapes already baked into the image)
    socket.on('canvas-saved', ({ roomId }) => {
        roomShapes[roomId] = [];
    });

    // restore-shapes: client loaded shapesData from DB and sends it back to populate
    // roomShapes so late joiners can receive a full sync-shapes list
    socket.on('restore-shapes', ({ roomId, shapes }) => {
        // Only restore if server doesn't already have live shapes (active session takes priority)
        if (!roomShapes[roomId] || roomShapes[roomId].length === 0) {
            roomShapes[roomId] = Array.isArray(shapes) ? shapes : [];
        }
    });


    // ── Admin: Kick / Ban ─────────────────────────────────
    socket.on('kick-user', ({ roomId, username, reason }) => {
        io.to(roomId).emit('kicked-user', { username, reason });
    });

    socket.on('ban-user', ({ roomId, username }) => {
        if (!bannedUsers[roomId]) bannedUsers[roomId] = [];
        if (!bannedUsers[roomId].includes(username)) {
            bannedUsers[roomId].push(username);
        }
        io.to(roomId).emit('kicked-user', { username, reason: 'You have been banned from this room.' });
    });

    // ── WebRTC Camera ─────────────────────────────────────
    socket.on('camera-toggle', ({ roomId, isVideoOn, username }) => {
        // Resolve username from room list if not provided
        const resolvedUsername = username || (usersInRooms[roomId] || []).find(u => u.id === socket.id)?.username || 'User';
        socket.to(roomId).emit('camera-status', { socketId: socket.id, isVideoOn, username: resolvedUsername });
    });

    // ── Get room peers (for sending offers to all) ────────
    socket.on('get-room-peers', ({ roomId }) => {
        const peers = (usersInRooms[roomId] || []).filter(u => u.id !== socket.id);
        socket.emit('room-peers', { peers });
    });

    socket.on('webrtc-offer', (data) => {
        io.to(data.to).emit('webrtc-offer', { ...data, from: socket.id });
    });

    socket.on('webrtc-answer', (data) => {
        io.to(data.to).emit('webrtc-answer', { ...data, from: socket.id });
    });

    socket.on('webrtc-ice-candidate', (data) => {
        io.to(data.to).emit('webrtc-ice-candidate', { ...data, from: socket.id });
    });

    // ── WebRTC Screen Share ───────────────────────────────
    socket.on('screen-share-toggle', ({ roomId, isScreenOn, username }) => {
        const resolvedUsername = username || (usersInRooms[roomId] || []).find(u => u.id === socket.id)?.username || 'User';
        socket.to(roomId).emit('screen-status', { socketId: socket.id, isScreenOn, username: resolvedUsername });
    });

    socket.on('webrtc-screen-offer', (data) => {
        io.to(data.to).emit('webrtc-screen-offer', { ...data, from: socket.id });
    });

    socket.on('webrtc-screen-answer', (data) => {
        io.to(data.to).emit('webrtc-screen-answer', { ...data, from: socket.id });
    });

    socket.on('webrtc-screen-ice-candidate', (data) => {
        io.to(data.to).emit('webrtc-screen-ice-candidate', { ...data, from: socket.id });
    });

    // ── Disconnect ────────────────────────────────────────
    socket.on('disconnect', () => {
        for (const roomId in usersInRooms) {
            const index = usersInRooms[roomId].findIndex(u => u.id === socket.id);
            if (index !== -1) {
                usersInRooms[roomId].splice(index, 1);
                io.to(roomId).emit('update-users', usersInRooms[roomId]);
            }
        }
        // Remove from pending if they disconnect while waiting
        for (const roomId in pendingUsers) {
            pendingUsers[roomId] = pendingUsers[roomId].filter(u => u.id !== socket.id);
        }
        // If host disconnects, assign new host
        for (const roomId in roomHosts) {
            if (roomHosts[roomId] === socket.id) {
                const remaining = usersInRooms[roomId] || [];
                if (remaining.length > 0) {
                    roomHosts[roomId] = remaining[0].id;
                    io.to(remaining[0].id).emit('host-transferred');
                } else {
                    delete roomHosts[roomId];
                }
            }
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
