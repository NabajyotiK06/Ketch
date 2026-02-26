import { useRef, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

// Generate a unique ID for each shape
let shapeIdCounter = 0;
const generateId = () => `shape_${Date.now()}_${shapeIdCounter++}`;

const Canvas = ({ roomId, color, fillColor = 'transparent', size, tool, socket: propSocket, theme = { bg: '#ffffff', bgImage: null, eraserColor: '#ffffff' }, locked = false, onHasContent }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const socketRef = useRef(null);
    const shapesRef = useRef([]);
    const drawingShapeRef = useRef(null);
    const remoteDrawingShapesRef = useRef({}); // { shapeId: shape } — in-progress from remote users
    const bgImageRef = useRef(null);           // saved DB canvas image used as static background
    const [isDrawing, setIsDrawing] = useState(false);
    const prevPos = useRef({ x: 0, y: 0 });
    const historyRef = useRef([]);
    const historyIndexRef = useRef(-1);
    const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, text: '' });
    const [canvasSize, setCanvasSize] = useState({ w: window.innerWidth, h: window.innerHeight });

    // Pan state
    const panOffsetRef = useRef({ x: 0, y: 0 });
    const panStartRef = useRef({ x: 0, y: 0 });
    const isPanningRef = useRef(false);

    // Selection state (multi-select)
    const selectedShapesRef = useRef([]);   // array of selected shapes
    const selectionRectRef = useRef(null);  // { x1,y1,x2,y2 } while rubber-banding
    const isDraggingSelectedRef = useRef(false); // true = moving shapes; false = drawing rect
    const selectionDragStartRef = useRef(null);  // per-frame drag origin
    const selectionStartPosRef = useRef(null);   // drag origin for total-delta emit
    const resizingRef = useRef(null); // { shape, handle: 'TL'|'TR'|'BR'|'BL'|'T'|'R'|'B'|'L' }
    const [, forceRender] = useState(0);

    const HANDLE_SIZE = 8;   // visual square side
    const HANDLE_HIT = 12;   // hit-test radius

    // Image cache: shapeId → HTMLImageElement (transient, not serialised)
    const imageCacheRef = useRef({});  // { [shapeId]: HTMLImageElement }
    // Hidden file input for the Image tool
    const imageInputRef = useRef(null);
    const pendingImagePos = useRef(null); // { wx, wy } where user clicked

    // ——— Drawing helpers ———

    const drawShape = useCallback((ctx, shape, offset = { x: 0, y: 0 }) => {
        if (!shape) return;
        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.strokeStyle = shape.color;
        ctx.fillStyle = 'transparent';
        ctx.lineWidth = shape.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (shape.type) {
            case 'pencil': {
                if (!shape.points || shape.points.length < 2) break;
                ctx.beginPath();
                ctx.moveTo(shape.points[0].x, shape.points[0].y);
                for (let i = 1; i < shape.points.length; i++) {
                    ctx.lineTo(shape.points[i].x, shape.points[i].y);
                }
                ctx.stroke();
                break;
            }
            case 'rectangle': {
                const w = shape.x2 - shape.x1;
                const h = shape.y2 - shape.y1;
                if (shape.fillColor && shape.fillColor !== 'transparent') {
                    ctx.fillStyle = shape.fillColor;
                    ctx.fillRect(shape.x1, shape.y1, w, h);
                }
                ctx.strokeRect(shape.x1, shape.y1, w, h);
                break;
            }
            case 'ellipse': {
                const cx = (shape.x1 + shape.x2) / 2;
                const cy = (shape.y1 + shape.y2) / 2;
                const rx = Math.abs(shape.x2 - shape.x1) / 2;
                const ry = Math.abs(shape.y2 - shape.y1) / 2;
                ctx.beginPath();
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                if (shape.fillColor && shape.fillColor !== 'transparent') {
                    ctx.fillStyle = shape.fillColor;
                    ctx.fill();
                }
                ctx.stroke();
                break;
            }
            case 'diamond': {
                const mx = (shape.x1 + shape.x2) / 2;
                const my = (shape.y1 + shape.y2) / 2;
                ctx.beginPath();
                ctx.moveTo(mx, shape.y1);
                ctx.lineTo(shape.x2, my);
                ctx.lineTo(mx, shape.y2);
                ctx.lineTo(shape.x1, my);
                ctx.closePath();
                if (shape.fillColor && shape.fillColor !== 'transparent') {
                    ctx.fillStyle = shape.fillColor;
                    ctx.fill();
                }
                ctx.stroke();
                break;
            }
            case 'line': {
                ctx.beginPath();
                ctx.moveTo(shape.x1, shape.y1);
                ctx.lineTo(shape.x2, shape.y2);
                ctx.stroke();
                break;
            }
            case 'arrow': {
                ctx.beginPath();
                ctx.moveTo(shape.x1, shape.y1);
                ctx.lineTo(shape.x2, shape.y2);
                ctx.stroke();
                // Draw arrowhead
                const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
                const headLen = Math.max(12, shape.size * 4);
                ctx.beginPath();
                ctx.moveTo(shape.x2, shape.y2);
                ctx.lineTo(
                    shape.x2 - headLen * Math.cos(angle - Math.PI / 6),
                    shape.y2 - headLen * Math.sin(angle - Math.PI / 6)
                );
                ctx.moveTo(shape.x2, shape.y2);
                ctx.lineTo(
                    shape.x2 - headLen * Math.cos(angle + Math.PI / 6),
                    shape.y2 - headLen * Math.sin(angle + Math.PI / 6)
                );
                ctx.stroke();
                break;
            }
            case 'text': {
                // Canvas API does NOT resolve CSS variables, so use the literal font
                ctx.font = `${shape.size * 3 + 12}px 'Architects Daughter', cursive`;
                ctx.fillStyle = shape.color;
                ctx.fillText(shape.text, shape.x1, shape.y1);
                break;
            }
            case 'eraser': {
                // Paint over with the background colour — syncs like a pencil stroke
                if (!shape.points || shape.points.length < 1) break;
                ctx.strokeStyle = shape.bgColor || '#ffffff';
                ctx.lineWidth = shape.size;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                if (shape.points.length === 1) {
                    ctx.arc(shape.points[0].x, shape.points[0].y, shape.size / 2, 0, Math.PI * 2);
                    ctx.fillStyle = shape.bgColor || '#ffffff';
                    ctx.fill();
                } else {
                    ctx.moveTo(shape.points[0].x, shape.points[0].y);
                    for (let i = 1; i < shape.points.length; i++) {
                        ctx.lineTo(shape.points[i].x, shape.points[i].y);
                    }
                    ctx.stroke();
                }
                break;
            }
            case 'image': {
                const iw = (shape.x2 || shape.x1 + 200) - shape.x1;
                const ih = (shape.y2 || shape.y1 + 150) - shape.y1;
                // Use cached element, or lazy-load from dataURL
                let imgEl = imageCacheRef.current[shape.id];
                if (!imgEl && shape.dataURL) {
                    imgEl = new window.Image();
                    imgEl.onload = () => {
                        imageCacheRef.current[shape.id] = imgEl;
                        redrawAll();
                    };
                    imgEl.src = shape.dataURL;
                    imageCacheRef.current[shape.id] = imgEl; // placeholder until loaded
                }
                if (imgEl && imgEl.complete && imgEl.naturalWidth) {
                    ctx.drawImage(imgEl, shape.x1, shape.y1, iw, ih);
                } else {
                    // Placeholder while loading
                    ctx.fillStyle = '#f3f4f6';
                    ctx.fillRect(shape.x1, shape.y1, iw, ih);
                    ctx.strokeStyle = '#d1d5db';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(shape.x1, shape.y1, iw, ih);
                }
                break;
            }
        }

        // Draw selection highlight
        if (shape.selected) {
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = '#6965db';
            ctx.lineWidth = 1.5;
            const bounds = getShapeBounds(shape);
            if (bounds) {
                ctx.strokeRect(bounds.x - 6, bounds.y - 6, bounds.w + 12, bounds.h + 12);

                // For image shapes: draw 8 resize handles
                if (shape.type === 'image') {
                    ctx.setLineDash([]);
                    const bx = bounds.x - 6, by = bounds.y - 6;
                    const bw = bounds.w + 12, bh = bounds.h + 12;
                    const handles = [
                        { x: bx, y: by },            // TL
                        { x: bx + bw / 2, y: by },            // T
                        { x: bx + bw, y: by },            // TR
                        { x: bx + bw, y: by + bh / 2 },  // R
                        { x: bx + bw, y: by + bh },       // BR
                        { x: bx + bw / 2, y: by + bh },       // B
                        { x: bx, y: by + bh },       // BL
                        { x: bx, y: by + bh / 2 },  // L
                    ];
                    handles.forEach(h => {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(h.x - 4, h.y - 4, 8, 8);
                        ctx.strokeStyle = '#6965db';
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(h.x - 4, h.y - 4, 8, 8);
                    });
                }
            }
            ctx.setLineDash([]);
        }

        ctx.restore();
    }, []);

    const getShapeBounds = (shape) => {
        if (!shape) return null;
        switch (shape.type) {
            case 'pencil':
            case 'eraser': {
                if (!shape.points || shape.points.length === 0) return null;
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const p of shape.points) {
                    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
                }
                return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
            }
            case 'text': {
                // Approximate bounds for text
                const estW = (shape.text?.length || 1) * (shape.size * 1.5 + 8);
                const estH = shape.size * 3 + 16;
                return { x: shape.x1, y: shape.y1 - estH, w: estW, h: estH };
            }
            default: {
                const x = Math.min(shape.x1, shape.x2);
                const y = Math.min(shape.y1, shape.y2);
                const w = Math.abs(shape.x2 - shape.x1);
                const h = Math.abs(shape.y2 - shape.y1);
                return { x, y, w, h };
            }
        }
    };

    const isPointInShape = (shape, px, py) => {
        const bounds = getShapeBounds(shape);
        if (!bounds) return false;
        const margin = Math.max(8, shape.size || 8); // shape.size can be undefined (e.g. image)
        return (
            px >= bounds.x - margin &&
            px <= bounds.x + bounds.w + margin &&
            py >= bounds.y - margin &&
            py <= bounds.y + bounds.h + margin
        );
    };

    // Helper: get resize handles for a selected image { id, x, y, cursor }
    const getImageHandles = (shape) => {
        const b = getShapeBounds(shape);
        if (!b) return [];
        const bx = b.x - 6, by = b.y - 6, bw = b.w + 12, bh = b.h + 12;
        return [
            { id: 'TL', x: bx, y: by, cursor: 'nwse-resize' },
            { id: 'T', x: bx + bw / 2, y: by, cursor: 'ns-resize' },
            { id: 'TR', x: bx + bw, y: by, cursor: 'nesw-resize' },
            { id: 'R', x: bx + bw, y: by + bh / 2, cursor: 'ew-resize' },
            { id: 'BR', x: bx + bw, y: by + bh, cursor: 'nwse-resize' },
            { id: 'B', x: bx + bw / 2, y: by + bh, cursor: 'ns-resize' },
            { id: 'BL', x: bx, y: by + bh, cursor: 'nesw-resize' },
            { id: 'L', x: bx, y: by + bh / 2, cursor: 'ew-resize' },
        ];
    };

    const redrawAll = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const offset = panOffsetRef.current;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the background (saved DB image) first so it's never lost
        if (bgImageRef.current) {
            ctx.drawImage(bgImageRef.current, 0, 0);
        }

        // Draw all saved shapes
        for (const shape of shapesRef.current) {
            drawShape(ctx, shape, offset);
        }

        // Draw the shape currently being drawn by THIS user (local preview)
        if (drawingShapeRef.current) {
            drawShape(ctx, drawingShapeRef.current, offset);
        }

        // Draw in-progress shapes from REMOTE users (real-time preview)
        for (const shape of Object.values(remoteDrawingShapesRef.current)) {
            drawShape(ctx, shape, offset);
        }

        // Draw rubber-band selection rectangle
        if (selectionRectRef.current) {
            const { x1, y1, x2, y2 } = selectionRectRef.current;
            const rx = Math.min(x1, x2) + offset.x;
            const ry = Math.min(y1, y2) + offset.y;
            const rw = Math.abs(x2 - x1);
            const rh = Math.abs(y2 - y1);
            ctx.save();
            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = '#6965db';
            ctx.lineWidth = 1.5;
            ctx.fillStyle = 'rgba(105,101,219,0.07)';
            ctx.fillRect(rx, ry, rw, rh);
            ctx.strokeRect(rx, ry, rw, rh);
            ctx.setLineDash([]);
            ctx.restore();
        }
    }, [drawShape]);

    // ——— History (undo/redo) ———

    const saveToHistory = useCallback(() => {
        const snapshot = JSON.parse(JSON.stringify(shapesRef.current));
        // Trim forward history if we undid things
        if (historyIndexRef.current < historyRef.current.length - 1) {
            historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
        }
        historyRef.current.push(snapshot);
        if (historyRef.current.length > 30) historyRef.current.shift();
        historyIndexRef.current = historyRef.current.length - 1;
    }, []);

    // ——— Socket setup ———

    useEffect(() => {
        // Use the prop socket if provided (shared from Whiteboard), otherwise create a new one
        if (propSocket) {
            socketRef.current = propSocket;
        } else {
            socketRef.current = io('http://localhost:5000');
            const username = localStorage.getItem('username') || 'Anonymous';
            socketRef.current.emit('join-room', { roomId, username });
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Load saved canvas: restore shape OBJECTS first (for selection/editing),
        // and use canvasData image only as a background for shapes that predate
        // shape-level tracking (legacy canvases with no shapesData).
        axios.get(`http://localhost:5000/api/rooms/${roomId}`).then(res => {
            const { canvasData, shapesData } = res.data || {};

            // Restore shape objects so they are selectable/deletable
            if (shapesData && shapesData !== '[]') {
                try {
                    const parsed = JSON.parse(shapesData);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        // Strip transient UI props (selected, imgEl) before restoring
                        shapesRef.current = parsed.map(s => {
                            const { selected, imgEl, ...rest } = s;
                            return rest;
                        });
                        // Emit to server so roomShapes is populated for late joiners
                        socketRef.current.emit('restore-shapes', { roomId, shapes: shapesRef.current });
                        redrawAll();
                        saveToHistory();
                        onHasContent?.();  // canvas is not blank — hide onboarding
                        return; // shapes restored — don't also set bgImageRef (would cause double draw)
                    }
                } catch (e) { console.warn('Failed to parse shapesData', e); }
            }

            // Legacy fallback: load baked PNG as background when no shapes metadata exists
            if (canvasData) {
                const img = new Image();
                img.onload = () => {
                    bgImageRef.current = img;
                    redrawAll();
                    saveToHistory();
                    onHasContent?.();  // legacy canvas has content — hide onboarding
                };
                img.src = canvasData;
            }
        }).catch(err => console.error('Failed to load canvas data', err));

        // ── sync-shapes: receive full shape list when joining a room ──────────────────────
        const handleSyncShapes = ({ shapes }) => {
            shapesRef.current = shapes ? JSON.parse(JSON.stringify(shapes)) : [];
            redrawAll();
        };

        // ── Real-time draw-move from another user ─────────────────────────────────
        const handleDrawMove = (data) => {
            const { shapeId, type, points, x1, y1, x2, y2, color, size, bgColor } = data;
            if (type === 'pencil' || type === 'eraser') {
                remoteDrawingShapesRef.current[shapeId] = {
                    id: shapeId, type, color, size, bgColor, points: points || []
                };
            } else {
                remoteDrawingShapesRef.current[shapeId] = {
                    id: shapeId, type, color, size, x1, y1, x2, y2
                };
            }
            redrawAll();
        };

        // Listen for shape additions from other users
        const handleAddShape = (shape) => {
            // Remove from remote in-progress since it's now finalized
            delete remoteDrawingShapesRef.current[shape.id];
            shapesRef.current.push(shape);
            redrawAll();
        };

        // Listen for shape deletions
        const handleDeleteShape = (shapeId) => {
            shapesRef.current = shapesRef.current.filter(s => s.id !== shapeId);
            redrawAll();
        };

        // Listen for shape moves
        const handleMoveShape = ({ id, dx, dy }) => {
            const shape = shapesRef.current.find(s => s.id === id);
            if (shape) {
                moveShapeBy(shape, dx, dy);
                redrawAll();
            }
        };

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

        socketRef.current.on('sync-shapes', handleSyncShapes);
        socketRef.current.on('draw-move', handleDrawMove);
        socketRef.current.on('add-shape', handleAddShape);
        socketRef.current.on('delete-shape', handleDeleteShape);
        socketRef.current.on('move-shape', handleMoveShape);

        // update-shape: a shape's properties changed (e.g., image resize)
        socketRef.current.on('update-shape', (updated) => {
            const idx = shapesRef.current.findIndex(s => s.id === updated.id);
            if (idx !== -1) {
                // Preserve local transient props (imgEl cached etc.) while updating coords
                shapesRef.current[idx] = { ...shapesRef.current[idx], ...updated };
                redrawAll();
            }
        });

        socketRef.current.on('clear', () => {
            shapesRef.current = [];
            bgImageRef.current = null; // also clear the saved DB background
            drawingShapeRef.current = null;
            remoteDrawingShapesRef.current = {};
            historyRef.current = [];
            historyIndexRef.current = -1;
            redrawAll();
        });

        // Periodic auto-save: persist PNG (thumbnail) + JSON shape list (for restoration)
        const saveInterval = setInterval(() => {
            const canvasData = canvas.toDataURL();
            const token = localStorage.getItem('token');
            if (token) {
                // Serialise shapes — strip transient/non-serialisable fields
                const shapesData = JSON.stringify(
                    shapesRef.current.map(s => {
                        const { selected, imgEl, ...rest } = s;
                        return rest;
                    })
                );
                axios.put(`http://localhost:5000/api/rooms/${roomId}/save`,
                    { canvasData, shapesData },
                    { headers: { 'x-auth-token': token } }
                ).catch(err => console.error('Auto-save failed', err));
            }
        }, 30000);



        return () => {
            clearInterval(saveInterval);

            // ── Save on unmount so drawings are never lost when the user exits ──
            const token = localStorage.getItem('token');
            if (token && canvasRef.current) {
                const canvasData = canvasRef.current.toDataURL();
                const shapesData = JSON.stringify(
                    shapesRef.current.map(s => {
                        const { selected, imgEl, ...rest } = s;
                        return rest;
                    })
                );
                axios.put(`http://localhost:5000/api/rooms/${roomId}/save`,
                    { canvasData, shapesData },
                    { headers: { 'x-auth-token': token } }
                ).catch(err => console.error('Save-on-exit failed', err));
            }

            socketRef.current.off('sync-shapes', handleSyncShapes);
            socketRef.current.off('draw-move', handleDrawMove);
            socketRef.current.off('add-shape', handleAddShape);
            socketRef.current.off('delete-shape', handleDeleteShape);
            socketRef.current.off('move-shape', handleMoveShape);
            // Only disconnect if we created our own socket
            if (!propSocket) {
                socketRef.current.disconnect();
            }
        };
    }, [roomId, redrawAll, saveToHistory, propSocket]);

    // ——— Delete key: remove all selected shapes ———

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key !== 'Delete' && e.key !== 'Backspace') return;
            // Don't intercept when user is typing in an input/textarea
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            if (selectedShapesRef.current.length > 0) {
                selectedShapesRef.current.forEach(shape => {
                    const idx = shapesRef.current.indexOf(shape);
                    if (idx !== -1) {
                        shapesRef.current.splice(idx, 1);
                        socketRef.current?.emit('delete-shape', { roomId, id: shape.id });
                    }
                });
                selectedShapesRef.current = [];
                saveToHistory();
                redrawAll();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [roomId, redrawAll, saveToHistory]);

    // ——— Helper: move a shape by dx, dy ———

    const moveShapeBy = (shape, dx, dy) => {
        if (shape.type === 'pencil' || shape.type === 'eraser') {
            shape.points = shape.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
        } else {
            shape.x1 += dx; shape.y1 += dy;
            if (shape.x2 !== undefined) { shape.x2 += dx; shape.y2 += dy; }
        }
    };

    // ——— Canvas to world coordinates (accounting for pan) ———

    const canvasToWorld = (offsetX, offsetY) => {
        return {
            x: offsetX - panOffsetRef.current.x,
            y: offsetY - panOffsetRef.current.y
        };
    };

    // ——— Mouse handlers ———

    const startDrawing = (e) => {
        const { offsetX, offsetY, clientX, clientY } = e.nativeEvent;
        const { x: wx, y: wy } = canvasToWorld(offsetX, offsetY);

        // Fill bucket tool — click on a shape to apply fillColor
        if (tool === 'fill') {
            for (let i = shapesRef.current.length - 1; i >= 0; i--) {
                const shape = shapesRef.current[i];
                if (['rectangle', 'ellipse', 'diamond'].includes(shape.type) && isPointInShape(shape, wx, wy)) {
                    shape.fillColor = fillColor;
                    socketRef.current?.emit('update-shape', { roomId, shape });
                    redrawAll();
                    break;
                }
            }
            return;
        }

        // Text tool
        if (tool === 'text') {
            const inputElement = document.getElementById('canvas-text-input');
            const latestText = inputElement ? inputElement.value : textInput.text;

            if (textInput.visible && latestText.trim() !== '') {
                finishText();
            } else if (!textInput.visible) {
                setTextInput({ visible: true, x: wx, y: wy, clientX, clientY, text: '' });
                setTimeout(() => document.getElementById('canvas-text-input')?.focus(), 10);
            }
            return;
        }

        // Pan tool
        if (tool === 'pan') {
            isPanningRef.current = true;
            panStartRef.current = { x: clientX, y: clientY };
            return;
        }

        // Selection tool
        if (tool === 'select') {
            // ─ Check resize handles first (only when single image selected) ─
            if (selectedShapesRef.current.length === 1) {
                const sel = selectedShapesRef.current[0];
                if (sel.type === 'image' && sel.selected) {
                    const handles = getImageHandles(sel);
                    for (const h of handles) {
                        if (Math.abs(wx - h.x) <= 12 && Math.abs(wy - h.y) <= 12) {
                            resizingRef.current = { shape: sel, handle: h.id };
                            setIsDrawing(true);
                            return; // skip deselect / normal hit-test
                        }
                    }
                }
            }

            // Clear previous selection
            selectedShapesRef.current.forEach(s => { s.selected = false; });
            selectedShapesRef.current = [];
            resizingRef.current = null;

            // Hit test: find shape under cursor (top to bottom)
            let found = null;
            for (let i = shapesRef.current.length - 1; i >= 0; i--) {
                if (isPointInShape(shapesRef.current[i], wx, wy)) {
                    found = shapesRef.current[i];
                    break;
                }
            }

            if (found) {
                // Click on a shape → select it, prepare to move
                found.selected = true;
                selectedShapesRef.current = [found];
                isDraggingSelectedRef.current = true;
                selectionDragStartRef.current = { x: wx, y: wy };
                selectionStartPosRef.current = { x: wx, y: wy };
                setIsDrawing(true);
            } else {
                // Click on empty space → start rubber-band
                isDraggingSelectedRef.current = false;
                selectionRectRef.current = { x1: wx, y1: wy, x2: wx, y2: wy };
                setIsDrawing(true);
            }
            redrawAll();
            forceRender(n => n + 1);
            return;
        }

        // Eraser tool — now paint-brush style (creates an eraser shape like pencil)
        if (tool === 'eraser') {
            setIsDrawing(true);
            drawingShapeRef.current = {
                id: generateId(),
                type: 'eraser',
                size,  // size = eraserSize when tool is eraser (set in Whiteboard)
                bgColor: theme.bg || '#ffffff',
                points: [{ x: wx, y: wy }]
            };
            redrawAll();
            return;
        }

        // Image tool — open file picker at click position
        if (tool === 'image') {
            pendingImagePos.current = { wx, wy };
            imageInputRef.current?.click();
            return;
        }

        // Shape tools
        setIsDrawing(true);
        prevPos.current = { x: wx, y: wy };

        if (tool === 'pencil') {
            drawingShapeRef.current = {
                id: generateId(),
                type: 'pencil',
                color,
                size,
                points: [{ x: wx, y: wy }]
            };
        } else if (['rectangle', 'ellipse', 'diamond', 'line', 'arrow'].includes(tool)) {
            drawingShapeRef.current = {
                id: generateId(),
                type: tool,
                x1: wx,
                y1: wy,
                x2: wx,
                y2: wy,
                color,
                fillColor: ['rectangle', 'ellipse', 'diamond'].includes(tool) ? fillColor : 'transparent',
                size
            };
        }
    };

    const draw = (e) => {
        const { offsetX, offsetY, clientX, clientY } = e.nativeEvent;
        const { x: wx, y: wy } = canvasToWorld(offsetX, offsetY);

        // Pan
        if (tool === 'pan' && isPanningRef.current) {
            const dx = clientX - panStartRef.current.x;
            const dy = clientY - panStartRef.current.y;
            panOffsetRef.current = {
                x: panOffsetRef.current.x + dx,
                y: panOffsetRef.current.y + dy
            };
            panStartRef.current = { x: clientX, y: clientY };
            redrawAll();
            return;
        }

        if (!isDrawing) return;

        // ─ Resize: drag a corner/edge handle of a selected image ─
        if (resizingRef.current) {
            const { shape, handle } = resizingRef.current;
            // Each handle controls certain coordinates:
            if (handle.includes('T')) shape.y1 = wy;
            if (handle.includes('B')) shape.y2 = wy;
            if (handle.includes('L')) shape.x1 = wx;
            if (handle.includes('R')) shape.x2 = wx;
            redrawAll();
            return;
        }

        // Selection: move selected shapes or update rubber-band rect
        if (tool === 'select') {
            if (isDraggingSelectedRef.current && selectedShapesRef.current.length > 0) {
                // Incrementally move every selected shape
                const dx = wx - selectionDragStartRef.current.x;
                const dy = wy - selectionDragStartRef.current.y;
                selectedShapesRef.current.forEach(s => moveShapeBy(s, dx, dy));
                selectionDragStartRef.current = { x: wx, y: wy };
            } else if (selectionRectRef.current) {
                // Extend rubber-band
                selectionRectRef.current.x2 = wx;
                selectionRectRef.current.y2 = wy;
            }
            redrawAll();
            return;
        }

        // Eraser: strokes appended like pencil
        if (tool === 'eraser') {
            if (!drawingShapeRef.current) return;
            drawingShapeRef.current.points.push({ x: wx, y: wy });
            socketRef.current.emit('draw-move', {
                roomId,
                shapeId: drawingShapeRef.current.id,
                type: 'eraser',
                size: drawingShapeRef.current.size,
                bgColor: drawingShapeRef.current.bgColor,
                points: drawingShapeRef.current.points,
            });
            redrawAll();
            return;
        }

        // Drawing shapes
        if (!drawingShapeRef.current) return;

        if (tool === 'pencil') {
            drawingShapeRef.current.points.push({ x: wx, y: wy });
            // Emit real-time pencil points so others see the stroke as it's drawn
            socketRef.current.emit('draw-move', {
                roomId,
                shapeId: drawingShapeRef.current.id,
                type: 'pencil',
                color: drawingShapeRef.current.color,
                size: drawingShapeRef.current.size,
                points: drawingShapeRef.current.points,
            });
        } else {
            drawingShapeRef.current.x2 = wx;
            drawingShapeRef.current.y2 = wy;
            // Emit real-time shape preview so others see it while dragging
            socketRef.current.emit('draw-move', {
                roomId,
                shapeId: drawingShapeRef.current.id,
                type: drawingShapeRef.current.type,
                color: drawingShapeRef.current.color,
                size: drawingShapeRef.current.size,
                x1: drawingShapeRef.current.x1,
                y1: drawingShapeRef.current.y1,
                x2: wx,
                y2: wy,
            });
        }
        redrawAll();
    };

    const stopDrawing = (e) => {
        // Pan
        if (tool === 'pan') {
            isPanningRef.current = false;
            return;
        }

        // ─ Finish resize ─
        if (resizingRef.current) {
            const { shape } = resizingRef.current;
            // Normalise so x1 < x2, y1 < y2
            if (shape.x1 > shape.x2) { const t = shape.x1; shape.x1 = shape.x2; shape.x2 = t; }
            if (shape.y1 > shape.y2) { const t = shape.y1; shape.y1 = shape.y2; shape.y2 = t; }
            // Broadcast the updated shape to other users
            socketRef.current.emit('update-shape', { roomId, shape });
            saveToHistory();
            resizingRef.current = null;
            setIsDrawing(false);
            redrawAll();
            return;
        }

        // Selection: finalise move or rubber-band
        if (tool === 'select') {
            if (isDraggingSelectedRef.current && selectedShapesRef.current.length > 0 && selectionStartPosRef.current) {
                const { offsetX, offsetY } = e?.nativeEvent || {};
                const { x: wxEnd, y: wyEnd } = canvasToWorld(offsetX || 0, offsetY || 0);
                const totalDx = wxEnd - selectionStartPosRef.current.x;
                const totalDy = wyEnd - selectionStartPosRef.current.y;
                // Emit move for each selected shape so server tracks new positions
                selectedShapesRef.current.forEach(shape => {
                    socketRef.current.emit('move-shape', {
                        roomId,
                        id: shape.id,
                        dx: totalDx,
                        dy: totalDy,
                    });
                });
                saveToHistory();
            } else if (selectionRectRef.current) {
                // Finalise rubber-band: select all shapes fully inside the rect
                const { x1, y1, x2, y2 } = selectionRectRef.current;
                const minX = Math.min(x1, x2), minY = Math.min(y1, y2);
                const maxX = Math.max(x1, x2), maxY = Math.max(y1, y2);
                const inside = shapesRef.current.filter(shape => {
                    const b = getShapeBounds(shape);
                    if (!b) return false;
                    // Shape must overlap the selection rect (not require full containment)
                    return b.x + b.w >= minX && b.x <= maxX && b.y + b.h >= minY && b.y <= maxY;
                });
                inside.forEach(s => { s.selected = true; });
                selectedShapesRef.current = inside;
                forceRender(n => n + 1);
            }
            selectionRectRef.current = null;
            isDraggingSelectedRef.current = false;
            selectionDragStartRef.current = null;
            selectionStartPosRef.current = null;
            setIsDrawing(false);
            redrawAll();
            return;
        }

        // Eraser — finalise like pencil
        if (tool === 'eraser') {
            if (isDrawing && drawingShapeRef.current) {
                shapesRef.current.push(drawingShapeRef.current);
                socketRef.current.emit('add-shape', { roomId, shape: drawingShapeRef.current });
                saveToHistory();
            }
            drawingShapeRef.current = null;
            setIsDrawing(false);
            return;
        }

        // Finalize shape
        if (isDrawing && drawingShapeRef.current) {
            shapesRef.current.push(drawingShapeRef.current);
            socketRef.current.emit('add-shape', {
                roomId,
                shape: drawingShapeRef.current
            });
            saveToHistory();
        }
        drawingShapeRef.current = null;
        setIsDrawing(false);
    };

    // ——— Image tool: handle file selection ———

    const handleImageFile = (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataURL = ev.target.result;
            // Determine natural size, scale to max 600px wide
            const tmpImg = new window.Image();
            tmpImg.onload = () => {
                const maxW = 600;
                const scale = tmpImg.naturalWidth > maxW ? maxW / tmpImg.naturalWidth : 1;
                const iw = tmpImg.naturalWidth * scale;
                const ih = tmpImg.naturalHeight * scale;
                const pos = pendingImagePos.current || { wx: 100, wy: 100 };
                const shape = {
                    id: generateId(),
                    type: 'image',
                    x1: pos.wx,
                    y1: pos.wy,
                    x2: pos.wx + iw,
                    y2: pos.wy + ih,
                    dataURL,
                };
                imageCacheRef.current[shape.id] = tmpImg;
                shapesRef.current.push(shape);
                // Strip dataURL from socket payload to avoid socket size limits;
                // other clients will render a placeholder (image sharing via socket is optional)
                socketRef.current.emit('add-shape', { roomId, shape });
                saveToHistory();
                redrawAll();
            };
            tmpImg.src = dataURL;
        };
        reader.readAsDataURL(file);
        // Reset so the same file can be picked again
        e.target.value = '';
    };

    // ——— Text tool ———

    const finishText = () => {
        const inputElement = document.getElementById('canvas-text-input');
        const latestText = inputElement ? inputElement.value : textInput.text;

        if (!textInput.visible || latestText.trim() === '') {
            setTextInput({ visible: false, x: 0, y: 0, text: '' });
            return;
        }

        const shape = {
            id: generateId(),
            type: 'text',
            x1: textInput.x,
            y1: textInput.y,
            text: latestText,
            color,
            size
        };
        shapesRef.current.push(shape);
        socketRef.current.emit('add-shape', { roomId, shape });
        saveToHistory();
        redrawAll();
        setTextInput({ visible: false, x: 0, y: 0, text: '' });
    };

    // ——— Expose global functions for toolbar buttons ———

    window.clearCanvas = () => {
        shapesRef.current = [];
        bgImageRef.current = null; // clear background too
        drawingShapeRef.current = null;
        historyRef.current = [];
        historyIndexRef.current = -1;
        redrawAll();
        socketRef.current.emit('clear', roomId);
    };

    window.downloadCanvas = () => {
        const canvas = canvasRef.current;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        const finalize = () => {
            // Draw all shapes onto the temp canvas
            for (const shape of shapesRef.current) {
                drawShape(tempCtx, { ...shape, selected: false }, panOffsetRef.current);
            }
            const link = document.createElement('a');
            link.download = `ketch-board-${Date.now()}.png`;
            link.href = tempCanvas.toDataURL();
            link.click();
        };

        if (theme.bgImage) {
            const bgImg = new window.Image();
            bgImg.crossOrigin = 'anonymous';
            bgImg.onload = () => {
                tempCtx.drawImage(bgImg, 0, 0, tempCanvas.width, tempCanvas.height);
                finalize();
            };
            bgImg.onerror = () => {
                tempCtx.fillStyle = theme.bg;
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                finalize();
            };
            bgImg.src = theme.bgImage;
        } else {
            tempCtx.fillStyle = theme.bg;
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            finalize();
        }
    };

    window.undoCanvas = () => {
        if (historyIndexRef.current > 0) {
            historyIndexRef.current -= 1;
            shapesRef.current = JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current]));
            redrawAll();
        } else if (historyIndexRef.current === 0) {
            historyIndexRef.current = -1;
            shapesRef.current = [];
            redrawAll();
        }
    };

    window.redoCanvas = () => {
        if (historyIndexRef.current < historyRef.current.length - 1) {
            historyIndexRef.current += 1;
            shapesRef.current = JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current]));
            redrawAll();
        }
    };

    // ——— Cursor per tool ———

    const getCursor = () => {
        if (locked) return 'not-allowed';
        switch (tool) {
            case 'pencil':
                return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>') 2 22, auto`;
            case 'eraser':
                return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="4" fill="white" stroke="%23333" stroke-width="1.5"/><line x1="6" y1="18" x2="18" y2="6" stroke="%23333" stroke-width="2" stroke-linecap="round"/></svg>') 12 12, cell`;
            case 'text':
                return 'text';
            case 'pan':
                // Custom dark-outlined hand cursors — native grab/grabbing appear white on some OS themes
                return isPanningRef.current
                    ? `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M9 11V6a1.5 1.5 0 0 1 3 0v4m0 0V4.5a1.5 1.5 0 0 1 3 0V10m0 0V6.5a1.5 1.5 0 0 1 3 0v8c0 3.5-2.5 6-6 6H9C6 20.5 4 18.5 4 16v-3a1.5 1.5 0 0 1 3 0" stroke="%23222" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="white"/></svg>') 8 8, grabbing`
                    : `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M18 11V8.5a1.5 1.5 0 0 0-3 0V11m0 0V7.5a1.5 1.5 0 0 0-3 0V11m0 0V6a1.5 1.5 0 0 0-3 0v8.5m0 0V11a1.5 1.5 0 0 0-3 0v4c0 3.5 2.5 6 6 6h1c3.5 0 6-2.5 6-6V11" stroke="%23222" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="white"/></svg>') 8 8, grab`;
            case 'select':
                return 'default';
            case 'image':
                return 'copy';
            case 'rectangle':
            case 'ellipse':
            case 'diamond':
            case 'line':
            case 'arrow':
                // High-contrast custom crosshair (black with white outline) visible on any background
                return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" stroke="white" stroke-width="3"/><line x1="1" y1="12" x2="23" y2="12" stroke="white" stroke-width="3"/><line x1="12" y1="1" x2="12" y2="23" stroke="%23111" stroke-width="1.5"/><line x1="1" y1="12" x2="23" y2="12" stroke="%23111" stroke-width="1.5"/></svg>') 12 12, crosshair`;
            default:
                return 'default';
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Hidden file input for the Image tool */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageFile}
            />
            <canvas
                ref={canvasRef}
                width={window.innerWidth}
                height={window.innerHeight}
                onMouseDown={locked ? undefined : startDrawing}
                onMouseMove={locked ? undefined : draw}
                onMouseUp={locked ? undefined : stopDrawing}
                onMouseLeave={locked ? undefined : stopDrawing}
                className="canvas-area"
                style={{
                    backgroundColor: theme.bg,
                    backgroundImage: theme.bgImage ? `url(${theme.bgImage})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: getCursor()
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
                        top: Math.max(0, textInput.clientY - (size * 3 + 12)),
                        fontFamily: "'Architects Daughter', cursive",
                        fontSize: `${Math.max(16, size * 3 + 12)}px`,
                        color: color,
                        background: 'rgba(255,255,255,0.85)',
                        border: '2px dashed var(--primary)',
                        outline: 'none',
                        zIndex: 10,
                        padding: '4px 8px',
                        margin: 0,
                        borderRadius: '6px',
                        minWidth: '120px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    }}
                />
            )}
        </div>
    );
};

export default Canvas;
