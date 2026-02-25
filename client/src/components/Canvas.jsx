import { useRef, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios'; // Added axios import

const Canvas = ({ roomId, color, size, tool, bgColor = '#ffffff' }) => {
    const canvasRef = useRef(null);
    const socketRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const prevPos = useRef({ x: 0, y: 0 });
    const history = useRef([]); // Added history ref
    const [historyIndex, setHistoryIndex] = useState(-1); // Added historyIndex state
    const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, text: '' });

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

        socketRef.current.on('draw-text', (data) => {
            const { x, y, text, color, size } = data;
            ctx.font = `${size * 3 + 12}px var(--doodle-font)`;
            ctx.fillStyle = color;
            ctx.fillText(text, x, y);
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
        const { clientX, clientY, offsetX, offsetY } = e.nativeEvent;

        if (tool === 'text') {
            if (textInput.visible && textInput.text.trim() !== '') {
                finishText();
            } else if (!textInput.visible) {
                // Use clientX and clientY for the absolute positioning of the input overlay, 
                // but offsetX / offsetY for drawing onto the canvas context.
                setTextInput({ visible: true, x: offsetX, y: offsetY, clientX, clientY, text: '' });
                setTimeout(() => document.getElementById('canvas-text-input')?.focus(), 10);
            }
            return;
        }

        setIsDrawing(true);
        prevPos.current = { x: offsetX, y: offsetY };
    };

    const finishText = () => {
        if (!textInput.visible || textInput.text.trim() === '') {
            setTextInput({ visible: false, x: 0, y: 0, text: '' });
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.font = `${size * 3 + 12}px var(--doodle-font)`;
        ctx.fillStyle = color;
        ctx.fillText(textInput.text, textInput.x, textInput.y);

        socketRef.current.emit('draw-text', {
            roomId,
            x: textInput.x,
            y: textInput.y,
            text: textInput.text,
            color,
            size
        });

        saveToHistory();
        setTextInput({ visible: false, x: 0, y: 0, text: '' });
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
    window.clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        history.current = [];
        setHistoryIndex(-1);
        socketRef.current.emit('clear', roomId);
    };

    window.downloadCanvas = () => {
        const canvas = canvasRef.current;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.fillStyle = bgColor;
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);

        const link = document.createElement('a');
        link.download = `ketch-board-${Date.now()}.png`;
        link.href = tempCanvas.toDataURL();
        link.click();
    };

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
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <canvas
                ref={canvasRef}
                width={window.innerWidth}
                height={window.innerHeight}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="canvas-area"
                style={{
                    backgroundColor: bgColor,
                    cursor: tool === 'pencil' ? 'default' : tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : 'default'
                }}
            />
            {textInput.visible && (
                <input
                    id="canvas-text-input"
                    type="text"
                    autoFocus
                    value={textInput.text}
                    onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && finishText()}
                    onBlur={finishText}
                    style={{
                        position: 'absolute',
                        left: textInput.clientX,
                        top: textInput.clientY - (size * 3 + 12),
                        fontFamily: 'var(--doodle-font)',
                        fontSize: `${size * 3 + 12}px`,
                        color: color,
                        background: 'transparent',
                        border: '1.5px dashed var(--primary)',
                        outline: 'none',
                        zIndex: 10,
                        padding: '2px 6px',
                        margin: 0,
                        backgroundColor: 'rgba(255,255,255,0.6)',
                        borderRadius: '4px'
                    }}
                />
            )}
        </div>
    );
};

export default Canvas;
