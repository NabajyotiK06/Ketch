const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const auth = require('../middleware/auth');

// @desc    Create a new room
// @route   POST /api/rooms/create
router.post('/create', auth, async (req, res) => {
    const { name, roomId } = req.body;

    try {
        const room = new Room({
            roomId,
            name,
            host: req.user,
        });

        await room.save();
        res.status(201).json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all rooms created by the current user
// @route   GET /api/rooms/my-rooms
router.get('/my-rooms', auth, async (req, res) => {
    try {
        const rooms = await Room.find({ host: req.user })
            .sort({ createdAt: -1 })
            .select('roomId name createdAt canvasData');
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get room by ID
// @route   GET /api/rooms/:roomId
router.get('/:roomId', async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId })
            .select('roomId name host canvasData shapesData createdAt');
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Save whiteboard session
// @route   PUT /api/rooms/:roomId/save
router.put('/:roomId/save', auth, async (req, res) => {
    const { canvasData, shapesData } = req.body;

    try {
        let room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        room.canvasData = canvasData;
        // Persist shapes JSON so they can be restored and selected/deleted on next open
        if (shapesData !== undefined) room.shapesData = shapesData;
        await room.save();
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete a room (host only)
// @route   DELETE /api/rooms/:roomId
router.delete('/:roomId', auth, async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        if (room.host.toString() !== req.user) {
            return res.status(403).json({ message: 'Only the host can delete this canvas' });
        }
        await Room.deleteOne({ roomId: req.params.roomId });
        res.json({ message: 'Canvas deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

