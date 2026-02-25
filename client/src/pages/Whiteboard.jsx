import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Eraser, Download, Trash2, RotateCcw, RotateCw, Settings, Users, MessageSquare, LogOut, Menu, Share2, Type, Palette } from 'lucide-react';
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
    const [bgColor, setBgColor] = useState('#ffffff');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
                <Canvas roomId={roomId} color={color} size={size} tool={tool} bgColor={bgColor} />
            </div>

            {/* Floating UI Overlay */}
            <div className="floating-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>

                {/* Top Left: Home/Menu */}
                <div className="action-box top-left animate-spring" style={{ animationDelay: '0.1s' }}>
                    <button className="sketch-panel tool-btn" onClick={() => navigate('/')} title="Go Home">
                        <Menu size={22} />
                    </button>
                    <div className="sketch-panel highlighter" style={{ display: 'flex', alignItems: 'center', padding: '0 1.2rem', fontFamily: 'var(--marker-font)', fontSize: '1.4rem' }}>
                        Ketch
                    </div>
                </div>

                {/* Top Center: Collapsible Toolbar menu */}
                <div style={{ position: 'absolute', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <button
                        className={`sketch-panel tool-btn animate-spring ${isMenuOpen ? 'active' : ''}`}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        style={{ width: 'auto', padding: '0.5rem 1.5rem', borderRadius: '30px', display: 'flex', gap: '0.6rem', background: '#ffffff' }}
                    >
                        <Settings size={20} /> <span style={{ fontWeight: 'bold' }}>Studio Tools</span>
                    </button>
                    {isMenuOpen && (
                        <div className="sketch-panel animate-spring" style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.2rem', borderRadius: '16px', minWidth: '240px', background: 'white', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                <button className={`tool-btn ${tool === 'pencil' ? 'active' : ''}`} onClick={() => setTool('pencil')} title="Pencil">
                                    <Pencil size={20} />
                                </button>
                                <button className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="Eraser">
                                    <Eraser size={20} />
                                </button>
                                <button className={`tool-btn ${tool === 'text' ? 'active' : ''}`} onClick={() => setTool('text')} title="Text">
                                    <Type size={20} />
                                </button>
                            </div>

                            <div style={{ height: '1.5px', background: '#eee', margin: '0 0.2rem' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-dim)' }}><Palette size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />Stroke Color</span>
                                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={tool === 'eraser'} style={{ width: '32px', height: '32px', cursor: 'pointer', padding: 0, border: 'none', background: color, borderRadius: '8px' }} />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-dim)' }}>Stroke Size</span>
                                <select value={size} onChange={(e) => setSize(Number(e.target.value))} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '0.2rem', fontFamily: 'var(--doodle-font)', background: '#f8f9fa' }}>
                                    <option value="2">Fine</option>
                                    <option value="5">Mid</option>
                                    <option value="10">Bold</option>
                                </select>
                            </div>

                            <div style={{ height: '1.5px', background: '#eee', margin: '0 0.2rem' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-dim)' }}>Paper Color</span>
                                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ width: '32px', height: '32px', cursor: 'pointer', padding: 0, border: 'none', background: bgColor, borderRadius: '8px' }} />
                            </div>

                            <div style={{ height: '1.5px', background: '#eee', margin: '0 0.2rem' }} />

                            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
                                <button onClick={handleDownload} title="Export Artwork" className="tool-btn" style={{ flex: 1 }}>
                                    <Download size={18} /> <span style={{ fontSize: '0.8rem', marginLeft: '0.4rem', fontWeight: 'bold' }}>Save</span>
                                </button>
                                <button onClick={handleClear} className="tool-btn" style={{ flex: 1, color: '#fa5252', background: '#fff5f5', borderColor: '#ffe6e6' }} title="Clear Paper">
                                    <Trash2 size={18} /> <span style={{ fontSize: '0.8rem', marginLeft: '0.4rem', fontWeight: 'bold' }}>Wipe</span>
                                </button>
                            </div>
                        </div>
                    )}
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
