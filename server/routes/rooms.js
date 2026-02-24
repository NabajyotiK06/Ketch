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

// @desc    Get room by ID
// @route   GET /api/rooms/:roomId
router.get('/:roomId', async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
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
    const { canvasData } = req.body;

    try {
        let room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Optional: Only allow host to save
        // if (room.host.toString() !== req.user) {
        //   return res.status(403).json({ message: 'Only host can save session' });
        // }

        room.canvasData = canvasData;
        await room.save();
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
