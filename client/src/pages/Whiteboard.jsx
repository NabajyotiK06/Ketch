import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Canvas from '../components/Canvas';
import Chat from '../components/Chat';
import { Pencil, Eraser, Trash2, Download, RotateCcw, RotateCw } from 'lucide-react';

const Whiteboard = () => {
    const { roomId } = useParams();
    const [color, setColor] = useState('#000000');
    const [size, setSize] = useState(5);
    const [tool, setTool] = useState('pencil');
    const [users, setUsers] = useState([]);

    const handleClear = () => {
        // We should emit a clear event via socket
        // Since socket is in Canvas, we might need to expose it or reload
        // For now, let's just trigger a reload which is simple
        window.location.reload();
    };

    const handleDownload = () => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `whiteboard-${roomId}.png`;
            link.href = image;
            link.click();
        }
    };

    return (
        <div className="whiteboard-container">
            <div className="toolbar">
                <button
                    className={tool === 'pencil' ? 'active' : ''}
                    onClick={() => setTool('pencil')}
                >
                    <Pencil size={20} />
                </button>
                <button
                    className={tool === 'eraser' ? 'active' : ''}
                    onClick={() => setTool('eraser')}
                >
                    <Eraser size={20} />
                </button>
                <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={tool === 'eraser'}
                />
                <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
                    <option value="2">Thin</option>
                    <option value="5">Medium</option>
                    <option value="10">Thick</option>
                    <option value="20">Extra Thick</option>
                </select>
                <button onClick={() => window.undoCanvas && window.undoCanvas()} title="Undo">
                    <RotateCcw size={20} />
                </button>
                <button onClick={() => window.redoCanvas && window.redoCanvas()} title="Redo">
                    <RotateCw size={20} />
                </button>
                <button onClick={handleDownload} title="Save as Image">
                    <Download size={20} />
                </button>
                <button onClick={handleClear} style={{ color: 'red' }} title="Clear Board">
                    <Trash2 size={20} />
                </button>
                <span style={{ marginLeft: '1rem', color: '#94a3b8', fontSize: '0.8rem' }}>Room ID: {roomId}</span>
            </div>

            <Canvas roomId={roomId} color={color} size={size} tool={tool} />

            <div className="sidebar">
                <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Online ({users.length})</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {users.map((u, i) => (
                            <span key={i} title={u.username} style={{ background: '#e0e7ff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                                {u.username}
                            </span>
                        ))}
                    </div>
                </div>
                <Chat roomId={roomId} onUsersUpdate={setUsers} />
            </div>
        </div>
    );
};

export default Whiteboard;
