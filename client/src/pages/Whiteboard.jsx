import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Eraser, Download, Trash2, RotateCcw, RotateCw, Settings, Users, MessageSquare, LogOut, Menu, Share2 } from 'lucide-react';
import Canvas from '../components/Canvas';
import Chat from '../components/Chat';
import { useAuth } from '../context/AuthContext';

const Whiteboard = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [color, setColor] = useState('#1e1e1e');
    const [size, setSize] = useState(2);
    const [tool, setTool] = useState('pencil');
    const [users, setUsers] = useState([]);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const handleClear = () => {
        if (window.confirm('Wipe the entire canvas clean?')) {
            window.clearCanvas && window.clearCanvas();
        }
    };

    const handleDownload = () => {
        window.downloadCanvas && window.downloadCanvas();
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="whiteboard-view">
            {/* Main Canvas Area */}
            <div className="canvas-container">
                <Canvas roomId={roomId} color={color} size={size} tool={tool} />
            </div>

            {/* Floating UI Overlay */}
            <div className="floating-overlay">

                {/* Top Left: Home/Menu */}
                <div className="action-box top-left animate-spring" style={{ animationDelay: '0.1s' }}>
                    <button className="sketch-panel tool-btn" onClick={() => navigate('/')} title="Go Home">
                        <Menu size={22} />
                    </button>
                    <div className="sketch-panel highlighter" style={{ display: 'flex', alignItems: 'center', padding: '0 1.2rem', fontFamily: 'var(--marker-font)', fontSize: '1.4rem' }}>
                        Ketch
                    </div>
                </div>

                {/* Top Center: Toolbar */}
                <div className="sketch-panel toolbar-floating animate-float-center">
                    <button
                        className={`tool-btn ${tool === 'pencil' ? 'active' : ''}`}
                        onClick={() => setTool('pencil')}
                        title="Drawing Pencil"
                    >
                        <Pencil size={20} />
                    </button>
                    <button
                        className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                        onClick={() => setTool('eraser')}
                        title="Eraser Tool"
                    >
                        <Eraser size={20} />
                    </button>

                    <div style={{ width: '1.5px', height: '28px', background: '#eee', margin: '0 0.8rem' }} />

                    <div className="tool-btn" style={{ position: 'relative' }}>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            disabled={tool === 'eraser'}
                            style={{
                                width: '32px',
                                height: '32px',
                                border: '2px solid #ddd',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                padding: 0,
                                background: color,
                                border: 'none'
                            }}
                        />
                    </div>

                    <select
                        value={size}
                        onChange={(e) => setSize(Number(e.target.value))}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            padding: '0 0.5rem',
                            fontFamily: 'var(--doodle-font)'
                        }}
                    >
                        <option value="2">Fine</option>
                        <option value="5">Mid</option>
                        <option value="10">Bold</option>
                    </select>

                    <div style={{ width: '1.5px', height: '28px', background: '#eee', margin: '0 0.8rem' }} />

                    <button onClick={handleDownload} title="Export Artwork" className="tool-btn">
                        <Download size={20} />
                    </button>
                    <button onClick={handleClear} className="tool-btn" style={{ color: '#fa5252' }} title="Clear Paper">
                        <Trash2 size={20} />
                    </button>
                </div>

                {/* Top Right: Actions */}
                <div className="action-box top-right animate-spring" style={{ animationDelay: '0.2s' }}>
                    <button className="sketch-panel tool-btn" style={{ background: '#eef2ff', color: 'var(--primary)', width: 'auto', padding: '0 1.2rem', fontSize: '1rem', fontWeight: 'bold', border: '2px solid var(--primary)' }}>
                        <Share2 size={18} style={{ marginRight: '0.6rem' }} /> Share
                    </button>
                    <button
                        className={`sketch-panel tool-btn ${isSidebarOpen ? 'active' : ''}`}
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        title="Toggle Chat"
                    >
                        <MessageSquare size={22} />
                        {users.length > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: -8,
                                right: -8,
                                background: 'var(--primary)',
                                color: 'white',
                                borderRadius: '50%',
                                width: '22px',
                                height: '22px',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid white',
                                fontWeight: 'bold'
                            }}>
                                {users.length}
                            </span>
                        )}
                    </button>
                    <button className="sketch-panel tool-btn" onClick={handleLogout} title="Exit Studio">
                        <LogOut size={22} />
                    </button>
                </div>

                {/* Bottom Left: Canvas Controls */}
                <div className="bottom-controls animate-spring" style={{ animationDelay: '0.3s' }}>
                    <div className="control-group">
                        <button className="tool-btn" onClick={() => window.undoCanvas?.()} title="Step Back">
                            <RotateCcw size={20} />
                        </button>
                        <button className="tool-btn" onClick={() => window.redoCanvas?.()} title="Step Forward">
                            <RotateCw size={20} />
                        </button>
                    </div>
                    <div className="sketch-panel highlighter" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', color: '#495057', fontWeight: 'bold' }}>
                        #{roomId}
                    </div>
                </div>

                {/* Right Side: Collapsible Panel */}
                <div className={`side-panel ${!isSidebarOpen ? 'hidden' : ''}`}>
                    <div className="chat-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Users size={20} />
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Studio Artists ({users.length})</span>
                        </div>
                        <button className="tool-btn" onClick={() => setSidebarOpen(false)}>
                            <LogOut size={18} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                    </div>

                    <div style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {users.map((u, i) => (
                            <span key={i} style={{
                                fontSize: '0.85rem',
                                background: '#f8f9fa',
                                padding: '0.3rem 0.8rem',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6',
                                fontWeight: 'bold'
                            }}>
                                @{u.username}
                            </span>
                        ))}
                    </div>

                    <Chat roomId={roomId} onUsersUpdate={setUsers} />
                </div>
            </div>
        </div>
    );
};

export default Whiteboard;
