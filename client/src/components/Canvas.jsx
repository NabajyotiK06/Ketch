import { useRef, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios'; // Added axios import

const Canvas = ({ roomId, color, size, tool }) => {
    const canvasRef = useRef(null);
    const socketRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const prevPos = useRef({ x: 0, y: 0 });
    const history = useRef([]); // Added history ref
    const [historyIndex, setHistoryIndex] = useState(-1); // Added historyIndex state

    useEffect(() => {
        // Initialize Socket
        socketRef.current = io('http://localhost:5000');
        const username = localStorage.getItem('username') || 'Anonymous'; // Moved username declaration
        socketRef.current.emit('join-room', { roomId, username });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Load initial data if exists
        axios.get(`http://localhost:5000/api/rooms/${roomId}`).then(res => {
            if (res.data.canvasData) {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear before drawing loaded image
                    ctx.drawImage(img, 0, 0);
                    // After loading, save to history
                    saveToHistory();
                };
                img.src = res.data.canvasData;
            }
        }).catch(err => console.error("Failed to load canvas data", err));

        // Handle incoming drawing data
        socketRef.current.on('draw', (data) => {
            const { x, y, prevX, prevY, color, size } = data;
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = size;
            ctx.lineCap = 'round';
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(x, y);
            ctx.stroke();
        });

        socketRef.current.on('clear', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            history.current = []; // Clear history on clear
            setHistoryIndex(-1);
        });

        // Periodic Auto-save
        const saveInterval = setInterval(() => {
            const canvasData = canvas.toDataURL();
            const token = localStorage.getItem('token');
            if (token) {
                axios.put(`http://localhost:5000/api/rooms/${roomId}/save`,
                    { canvasData },
                    { headers: { 'x-auth-token': token } }
                ).catch(err => console.error("Auto-save failed", err));
            }
        }, 30000); // Every 30 seconds

        return () => {
            clearInterval(saveInterval); // Clear interval on unmount
            socketRef.current.disconnect();
        };
    }, [roomId]);

    const saveToHistory = () => {
        const canvas = canvasRef.current;
        if (!canvas) return; // Ensure canvas exists
        const snapshot = canvas.toDataURL();

        // If we were in the middle of undo, remove forward history
        if (historyIndex < history.current.length - 1) {
            history.current = history.current.slice(0, historyIndex + 1);
        }

        history.current.push(snapshot);
        if (history.current.length > 20) history.current.shift(); // Limit history
        setHistoryIndex(history.current.length - 1);
    };

    const startDrawing = (e) => {
        const { offsetX, offsetY } = e.nativeEvent;
        setIsDrawing(true);
        prevPos.current = { x: offsetX, y: offsetY };
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = e.nativeEvent;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.beginPath();
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.moveTo(prevPos.current.x, prevPos.current.y);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();

        // Emit drawing data
        socketRef.current.emit('draw', {
            roomId,
            x: offsetX,
            y: offsetY,
            prevX: prevPos.current.x,
            prevY: prevPos.current.y,
            color: tool === 'eraser' ? '#ffffff' : color,
            size
        });

        prevPos.current = { x: offsetX, y: offsetY };
    };

    const stopDrawing = () => {
        if (isDrawing) { // Only save to history if drawing actually occurred
            saveToHistory();
        }
        setIsDrawing(false);
    };

    // Expose Undo/Redo functions via window for the toolbar (simple way)
    window.undoCanvas = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            const img = new Image();
            img.onload = () => {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = history.current[newIndex];
        }
    };

    window.redoCanvas = () => {
        if (historyIndex < history.current.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            const img = new Image();
            img.onload = () => {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = history.current[newIndex];
        }
    };

    return (
        <canvas
            ref={canvasRef}
            width={window.innerWidth - 300}
            height={window.innerHeight - 64}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="canvas-area"
        />
    );
};

export default Canvas;
