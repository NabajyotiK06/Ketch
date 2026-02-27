import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import {
    Pencil, Eraser, Download, Trash2, RotateCcw, RotateCw,
    Settings, Users, MessageSquare, LogOut, Menu, Share2, Type,
    Image, Palette, Lock, Hand, MousePointer2, Square, Diamond,
    Circle, MoveRight, Minus, Copy, Check, UserCheck, UserX, Clock,
    Sun, Moon, Droplets
} from 'lucide-react';
import Canvas from '../components/Canvas';
import Chat from '../components/Chat';
import VideoGrid from '../components/VideoGrid';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';

const Whiteboard = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Drawing state
    const [color, setColor] = useState('#1e1e1e');
    const [fillColor, setFillColor] = useState('transparent');
    const [size, setSize] = useState(2);
    const [eraserSize, setEraserSize] = useState(20);
    const [tool, setTool] = useState('pencil');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    // Onboarding overlay — shown once, dismissed on first interaction
    const [showOnboarding, setShowOnboarding] = useState(true);
    const dismissOnboarding = () => setShowOnboarding(false);
    const [isLocked, setIsLocked] = useState(false);

    // Global dark mode (persisted in localStorage)
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('ketch-theme') === 'dark');

    // Keep data-theme attribute in sync and persist to localStorage
    useEffect(() => {
        document.documentElement.dataset.theme = darkMode ? 'dark' : '';
        localStorage.setItem('ketch-theme', darkMode ? 'dark' : 'light');
        // Auto-flip pen color so it's visible on the new canvas bg
        if (darkMode && color === '#1e1e1e') setColor('#ffffff');
        else if (!darkMode && color === '#ffffff') setColor('#1e1e1e');
    }, [darkMode]);

    // Derived: canvas background and eraser color from current theme
    const canvasBg = darkMode ? '#16213e' : '#ffffff';
    const currentTheme = { bg: canvasBg, eraserColor: canvasBg };
    const [users, setUsers] = useState([]);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [hostId, setHostId] = useState(null);

    // Guest join state (for unauthenticated users via invite link)
    const [guestName, setGuestName] = useState('');
    const [guestNameInput, setGuestNameInput] = useState('');
    const [guestNameError, setGuestNameError] = useState('');

    // Share link state
    const [linkCopied, setLinkCopied] = useState(false);

    // Join approval state
    const [joinStatus, setJoinStatus] = useState('loading'); // 'loading' | 'pending' | 'admitted' | 'rejected'
    const [pendingUsers, setPendingUsers] = useState([]); // users waiting for approval (host sees these)
    const [isHost, setIsHost] = useState(false);
    const [isSocketHost, setIsSocketHost] = useState(false); // set by server 'you-are-host' event

    const socketRef = useRef(null);
    const [socket, setSocket] = useState(null); // state version so children re-render when ready



    // Load room info
    useEffect(() => {
        axios.get(`${API_URL}/api/rooms/${roomId}`)
            .then(res => setHostId(res.data.host))
            .catch(err => console.error('Failed to load room details', err));
    }, [roomId]);

    // Socket setup — only connect once we have an identity
    useEffect(() => {
        const username = user?.username || guestName;
        if (!username) return; // wait until guest enters a name
        socketRef.current = io(API_URL);
        setSocket(socketRef.current);
        socketRef.current.emit('join-room', { roomId, username });

        // ── Join flow events ──────────────────────────────
        socketRef.current.on('join-approved', () => {
            setJoinStatus('admitted');
        });

        socketRef.current.on('join-pending', () => {
            setJoinStatus('pending');
        });

        socketRef.current.on('join-rejected', () => {
            setJoinStatus('rejected');
        });

        socketRef.current.on('you-are-host', () => {
            setIsSocketHost(true);
        });

        socketRef.current.on('host-transferred', () => {
            setIsHost(true);
            setIsSocketHost(true); // promoted to host mid-session
        });

        // ── Pending users (host sees these) ───────────────
        socketRef.current.on('join-request', ({ socketId, username: pendingName }) => {
            setPendingUsers(prev => {
                if (prev.find(u => u.socketId === socketId)) return prev;
                return [...prev, { socketId, username: pendingName }];
            });
            // Auto-open sidebar so host notices
            setSidebarOpen(true);
        });

        socketRef.current.on('pending-update', (list) => {
            setPendingUsers(list);
        });

        // ── Other events ──────────────────────────────────
        socketRef.current.on('kicked-user', (data) => {
            if (data.username === username) {
                alert(data.reason || 'You have been kicked from the room.');
                navigate('/');
            }
        });

        socketRef.current.on('banned-error', () => {
            alert('You are banned from this room.');
            navigate('/');
        });

        socketRef.current.on('update-users', (userList) => {
            setUsers(userList);
        });

        return () => { socketRef.current?.disconnect(); setSocket(null); };
    }, [roomId, user, guestName, navigate]);

    // Determine if current user is host (by DB host field OR socket-level host signal)
    const isAdmin = (hostId && user && hostId === user._id) || isSocketHost;

    // ── Handlers ─────────────────────────────────────────
    const handleAccept = (socketId) => {
        socketRef.current.emit('accept-user', { roomId, socketId });
        setPendingUsers(prev => prev.filter(u => u.socketId !== socketId));
    };

    const handleReject = (socketId) => {
        socketRef.current.emit('reject-user', { roomId, socketId });
        setPendingUsers(prev => prev.filter(u => u.socketId !== socketId));
    };

    const handleKick = (username) => {
        socketRef.current.emit('kick-user', { roomId, username });
    };

    const handleBan = (username) => {
        socketRef.current.emit('ban-user', { roomId, username });
    };

    const handleClear = () => {
        if (window.confirm('Wipe the entire canvas clean?')) {
            window.clearCanvas && window.clearCanvas();
        }
    };

    const handleDownload = () => {
        window.downloadCanvas && window.downloadCanvas();
    };

    const handleLogout = () => { if (user) logout(); navigate('/'); };

    const handleShare = async () => {
        const link = `${window.location.origin}/room/${roomId}`;
        try {
            await navigator.clipboard.writeText(link);
        } catch {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = link; document.body.appendChild(ta);
            ta.select(); document.execCommand('copy');
            document.body.removeChild(ta);
        }
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
    };

    // ── Guest Name Popup ──────────────────────────────────
    if (!user && !guestName) {
        const handleGuestJoin = (e) => {
            e.preventDefault();
            const trimmed = guestNameInput.trim();
            if (!trimmed) { setGuestNameError('Please enter a name to continue.'); return; }
            if (trimmed.length < 2) { setGuestNameError('Name must be at least 2 characters.'); return; }
            if (trimmed.length > 24) { setGuestNameError('Name must be 24 characters or less.'); return; }
            setGuestName(trimmed);
        };
        return (
            <div className="guest-join-screen">
                <div className="guest-join-card">
                    <div className="guest-join-logo">✏️</div>
                    <h2>You're invited!</h2>
                    <p>Enter a display name to join the session as a guest.</p>
                    <form onSubmit={handleGuestJoin} style={{ width: '100%', marginTop: '1.2rem' }}>
                        <input
                            className="sketch-input guest-name-input"
                            type="text"
                            placeholder="Your name…"
                            value={guestNameInput}
                            onChange={e => { setGuestNameInput(e.target.value); setGuestNameError(''); }}
                            autoFocus
                            maxLength={24}
                        />
                        {guestNameError && (
                            <p className="guest-name-error">{guestNameError}</p>
                        )}
                        <button type="submit" className="guest-join-btn">
                            Join Session →
                        </button>
                    </form>
                    <p className="guest-join-footer">
                        Have an account? <a href="/login">Sign in</a>
                    </p>
                </div>
            </div>
        );
    }

    // ── Waiting/Rejected screens ──────────────────────────
    if (joinStatus === 'pending') {
        return (
            <div className="join-waiting-screen">
                <div className="join-waiting-card">
                    <div className="join-waiting-icon">
                        <Clock size={40} style={{ color: 'var(--primary)' }} />
                    </div>
                    <h2>Waiting for approval</h2>
                    <p>The host has been notified. Please wait while they admit you to the session.</p>
                    <div className="join-waiting-dots">
                        <span /><span /><span />
                    </div>
                    <button className="sketch-button" onClick={() => navigate('/')} style={{ marginTop: '1rem', color: 'var(--text-dim)' }}>
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    if (joinStatus === 'rejected') {
        return (
            <div className="join-waiting-screen">
                <div className="join-waiting-card">
                    <div className="join-waiting-icon" style={{ color: '#dc2626' }}>
                        <UserX size={40} />
                    </div>
                    <h2 style={{ color: '#dc2626' }}>Access Denied</h2>
                    <p>The host did not admit you to this session.</p>
                    <button className="sketch-button" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    // Still waiting for first server response
    if (joinStatus === 'loading') {
        return (
            <div className="join-waiting-screen">
                <div className="join-waiting-card">
                    <div className="join-waiting-dots"><span /><span /><span /></div>
                    <p style={{ color: 'var(--text-dim)', marginTop: '1rem' }}>Connecting…</p>
                </div>
            </div>
        );
    }

    // ── Main Whiteboard UI ────────────────────────────────
    return (
        <div className="whiteboard-view" onClick={showOnboarding ? dismissOnboarding : undefined}>
            {/* Link Copied Toast */}
            <div className={`share-toast ${linkCopied ? 'visible' : ''}`}>
                <Check size={16} style={{ marginRight: '0.4rem' }} />
                Invite link copied!
            </div>

            {/* Onboarding Overlay */}
            {showOnboarding && (
                <div className="onboarding-overlay" aria-hidden="true">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, pointerEvents: 'none' }}
                        viewBox="0 0 1024 540"
                        preserveAspectRatio="xMidYMid meet"
                    >
                        <defs>
                            <style>{`
                                .ob-text {
                                    font-family: 'Caveat', 'Segoe UI', cursive;
                                    font-size: 18px;
                                    fill: #9ca3af;
                                    letter-spacing: 0.02em;
                                }
                                .ob-arrow {
                                    fill: none;
                                    stroke: #9ca3af;
                                    stroke-width: 2;
                                    stroke-linecap: round;
                                    stroke-linejoin: round;
                                }
                            `}</style>
                            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                                <path d="M0,0 L8,4 L0,8 Z" fill="#9ca3af" />
                            </marker>
                        </defs>

                        {/* ── Available Canvas label (top-left area) ── */}
                        {/* Arrow pointing up-left to the Menu (≡) button */}
                        <path className="ob-arrow" d="M55,60 Q38,44 24,28" marker-end="url(#arrowhead)" />
                        <text className="ob-text" x="38" y="78">Available canvas</text>

                        {/* ── Tools Bar label (top-center) ── */}
                        {/* Arrow from label curving up to the toolbar */}
                        <path className="ob-arrow" d="M392,128 Q388,95 384,58" marker-end="url(#arrowhead)" />
                        <text className="ob-text" x="378" y="140">Tools Bar</text>

                        {/* ── Users label (top-right) ── */}
                        {/* Arrow from label curving up-right to the NA avatar */}
                        <path className="ob-arrow" d="M762,68 Q790,44 820,26" marker-end="url(#arrowhead)" />
                        <text className="ob-text" x="722" y="84">Users</text>

                        {/* ── Chat label (far top-right) ── */}
                        {/* Arrow from Chat label curving up to the chat icon */}
                        <path className="ob-arrow" d="M926,138 Q960,100 992,60" marker-end="url(#arrowhead)" />
                        <text className="ob-text" x="908" y="155">Chat</text>

                        {/* ── Undo/Redo label (bottom-left) ── */}
                        {/* Arrow curving from label down-left to the buttons */}
                        <path className="ob-arrow" d="M155,366 Q108,442 50,512" marker-end="url(#arrowhead)" />
                        <text className="ob-text" x="148" y="358">undo/redo</text>

                        {/* ── Drawing Board label (center) ── */}
                        {/* 4 diagonal arrows pointing outward from center */}
                        {/* top-left arrow */}
                        <path className="ob-arrow" d="M492,280 L462,255" marker-end="url(#arrowhead)" />
                        {/* top arrow */}
                        <path className="ob-arrow" d="M512,272 L512,242" marker-end="url(#arrowhead)" />
                        {/* top-right arrow */}
                        <path className="ob-arrow" d="M532,280 L558,255" marker-end="url(#arrowhead)" />
                        {/* bottom-left arrow */}
                        <path className="ob-arrow" d="M492,310 L462,338" marker-end="url(#arrowhead)" />
                        {/* bottom-right arrow */}
                        <path className="ob-arrow" d="M532,310 L562,338" marker-end="url(#arrowhead)" />
                        <text className="ob-text" x="468" y="306">Drawing Board</text>

                        {/* Tap anywhere hint */}
                        <text style={{ fontFamily: "'Caveat', cursive", fontSize: '14px', fill: '#c4b5fd' }} x="50%" y="97%" textAnchor="middle">
                            Click anywhere to start drawing ✦
                        </text>
                    </svg>
                </div>
            )}

            {/* Main Canvas */}
            <div className="canvas-container">
                <Canvas roomId={roomId} color={color} fillColor={fillColor} size={tool === 'eraser' ? eraserSize : size} tool={tool} socket={socket} theme={currentTheme} locked={isLocked} onHasContent={dismissOnboarding} />
            </div>

            {/* Floating UI Overlay */}
            <div className="floating-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>

                {/* Top Left: Menu */}
                <div className="action-box top-left animate-spring" style={{ animationDelay: '0.1s', alignItems: 'center' }}>
                    <button className="sketch-panel tool-btn" onClick={() => navigate('/')} title="Go Home">
                        <Menu size={22} />
                    </button>
                </div>

                {/* Top Center Toolbar */}
                <div className="top-toolbar-wrapper">
                    <div className="top-toolbar animate-spring" style={{ animationDelay: '0.15s' }} onClick={showOnboarding ? dismissOnboarding : undefined}>
                        <button
                            className={`sketch-panel tool-btn ${isLocked ? 'active' : ''}`}
                            onClick={() => setIsLocked(l => !l)}
                            title={isLocked ? 'Canvas locked — click to unlock' : 'Lock canvas (disable drawing)'}
                            style={isLocked ? { background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' } : {}}
                        >
                            <Lock size={16} />
                        </button>
                        <div style={{ width: '1px', height: '20px', background: '#e5e7eb', margin: '0 2px', flexShrink: 0 }} />
                        <button className={`tool-btn ${tool === 'pan' ? 'active' : ''}`} onClick={() => setTool('pan')} title="Hand (H)"><Hand size={16} /></button>
                        <button className={`tool-btn ${tool === 'select' ? 'active' : ''}`} onClick={() => setTool('select')} title="Select (V)"><MousePointer2 size={16} /></button>
                        <button className={`tool-btn ${tool === 'rectangle' ? 'active' : ''}`} onClick={() => setTool('rectangle')} title="Rectangle (R)"><Square size={16} /></button>
                        <button className={`tool-btn ${tool === 'diamond' ? 'active' : ''}`} onClick={() => setTool('diamond')} title="Diamond (D)"><Diamond size={16} /></button>
                        <button className={`tool-btn ${tool === 'ellipse' ? 'active' : ''}`} onClick={() => setTool('ellipse')} title="Ellipse (E)"><Circle size={16} /></button>
                        <button className={`tool-btn ${tool === 'arrow' ? 'active' : ''}`} onClick={() => setTool('arrow')} title="Arrow (A)"><MoveRight size={16} /></button>
                        <button className={`tool-btn ${tool === 'line' ? 'active' : ''}`} onClick={() => setTool('line')} title="Line (L)"><Minus size={16} /></button>
                        <button className={`tool-btn ${tool === 'pencil' ? 'active' : ''}`} onClick={() => setTool('pencil')} title="Pencil (P)"><Pencil size={16} /></button>
                        <button className={`tool-btn ${tool === 'text' ? 'active' : ''}`} onClick={() => setTool('text')} title="Text (T)"><Type size={16} /></button>
                        <button className={`tool-btn ${tool === 'image' ? 'active' : ''}`} onClick={() => setTool('image')} title="Image"><Image size={16} /></button>
                        <button className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="Eraser"><Eraser size={16} /></button>
                        <button className={`tool-btn ${tool === 'fill' ? 'active' : ''}`} onClick={() => setTool('fill')} title="Fill (bucket)">
                            <Droplets size={16} />
                        </button>
                        <div style={{ width: '1px', height: '20px', background: 'var(--panel-border)', margin: '0 2px', flexShrink: 0 }} />

                        {/* Stroke + Fill colour swatches */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', margin: '0 3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Stroke Color">
                                <span style={{ fontSize: '9px', color: 'var(--text-dim)', userSelect: 'none', lineHeight: 1 }}>S</span>
                                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={tool === 'eraser'}
                                    style={{ width: '20px', height: '20px', cursor: 'pointer', padding: 0, border: '2px solid var(--panel-border)', borderRadius: '4px', opacity: tool === 'eraser' ? 0.4 : 1 }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Fill Color">
                                <span style={{ fontSize: '9px', color: 'var(--text-dim)', userSelect: 'none', lineHeight: 1 }}>F</span>
                                <div style={{ position: 'relative', width: '20px', height: '20px' }}>
                                    <input type="color" value={fillColor === 'transparent' ? '#ffffff' : fillColor}
                                        onChange={(e) => setFillColor(e.target.value)}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer', padding: 0, border: '2px solid var(--panel-border)', borderRadius: '4px' }} />
                                    {fillColor === 'transparent' && (
                                        <div onClick={() => setFillColor('#ffffff')} title="No fill — click to set fill"
                                            style={{ position: 'absolute', inset: 0, background: 'white', borderRadius: '3px', border: '2px solid var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'auto' }}>
                                            <div style={{ width: '14px', height: '1.5px', background: '#dc2626', transform: 'rotate(-45deg)' }} />
                                        </div>
                                    )}
                                </div>
                                {fillColor !== 'transparent' && (
                                    <button onClick={() => setFillColor('transparent')} title="Remove fill"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-dim)', fontSize: '10px', lineHeight: 1 }}>✕</button>
                                )}
                            </div>
                        </div>

                        {/* Settings */}
                        <button className={`tool-btn ${isMenuOpen ? 'active' : ''}`} onClick={() => setIsMenuOpen(!isMenuOpen)} title="Properties">
                            <Settings size={16} />
                        </button>

                        {/* Dark / Light Mode Toggle */}
                        <button
                            className={`tool-btn ${darkMode ? 'active' : ''}`}
                            onClick={() => setDarkMode(d => !d)}
                            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            style={darkMode ? { color: '#f4bc2e' } : {}}
                        >
                            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                    </div>
                </div>{/* end top-toolbar-wrapper */}

                {/* Properties Panel */}
                {isMenuOpen && (
                    <div className="sketch-panel animate-spring" style={{ position: 'absolute', left: '50%', top: '4.5rem', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', borderRadius: '8px', minWidth: '220px', background: 'var(--panel-bg)', boxShadow: 'var(--floating-shadow)', zIndex: 15 }}>
                        {tool === 'eraser' ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-dim)' }}>Eraser Size</span>
                                <input type="range" min="5" max="100" value={eraserSize} onChange={(e) => setEraserSize(Number(e.target.value))} style={{ width: '100px', cursor: 'pointer', accentColor: 'var(--primary)' }} />
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-dim)' }}>Stroke Size</span>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 'bold', minWidth: '28px', textAlign: 'right' }}>{size}px</span>
                                </div>
                                <input type="range" min="1" max="40" value={size} onChange={(e) => setSize(Number(e.target.value))}
                                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    {[1, 3, 8, 16, 40].map(v => (
                                        <button key={v} onClick={() => setSize(v)}
                                            style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--panel-border)', background: size === v ? 'var(--primary)' : 'var(--input-bg)', color: size === v ? 'white' : 'var(--text-dim)', cursor: 'pointer', fontFamily: 'var(--doodle-font)' }}>
                                            {v === 1 ? 'Fine' : v === 3 ? 'Med' : v === 8 ? 'Bold' : v === 16 ? 'Thick' : 'Marker'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div style={{ height: '1.5px', background: 'var(--divider)', margin: '0 0.2rem' }} />
                        <button onClick={handleClear} className="tool-btn" style={{ width: '100%', color: '#dc2626', background: '#fee2e2', borderRadius: '6px' }} title="Clear Canvas">
                            <Trash2 size={16} /> <span style={{ fontSize: '0.8rem', marginLeft: '0.4rem', fontWeight: '500' }}>Clear canvas</span>
                        </button>
                    </div>
                )}

                {/* Top Right: Actions */}
                <div className="action-box top-right animate-spring" style={{ animationDelay: '0.2s', zIndex: 20, flexWrap: 'nowrap' }}>
                    {/* User Avatars */}
                    <div className="sketch-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.5rem', flexShrink: 0 }}>
                        <div style={{ display: 'flex' }}>
                            {users.slice(0, 3).map((u, i) => (
                                <div key={i} style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold', marginLeft: i > 0 ? '-6px' : '0', border: '2px solid white', zIndex: 3 - i, flexShrink: 0 }}>
                                    {u.username.substring(0, 2).toUpperCase()}
                                </div>
                            ))}
                            {users.length > 3 && (
                                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#e9ecef', color: '#495057', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold', marginLeft: '-6px', border: '2px solid white', zIndex: 0, flexShrink: 0 }}>
                                    +{users.length - 3}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Share Button */}
                    <button className="sketch-panel tool-btn" onClick={handleShare}
                        style={{ background: linkCopied ? '#f0fdf4' : '#eef2ff', color: linkCopied ? '#16a34a' : 'var(--primary)', width: 'auto', padding: '0 0.8rem', fontSize: '0.8rem', fontWeight: 'bold', border: `1.5px solid ${linkCopied ? '#86efac' : 'var(--primary)'}`, height: '36px', flexShrink: 0, transition: 'all 0.3s ease' }}>
                        {linkCopied ? <Check size={14} style={{ marginRight: '0.4rem' }} /> : <Copy size={14} style={{ marginRight: '0.4rem' }} />}
                        {linkCopied ? 'Copied!' : 'Share'}
                    </button>

                    <button className="sketch-panel tool-btn" onClick={handleDownload} title="Export" style={{ flexShrink: 0 }}>
                        <Download size={18} />
                    </button>

                    {/* Chat / Users toggle — badge for pending */}
                    <button className={`sketch-panel tool-btn ${isSidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(!isSidebarOpen)} title="Toggle Chat" style={{ flexShrink: 0, position: 'relative' }}>
                        <MessageSquare size={18} />
                        {(users.length > 0 || pendingUsers.length > 0) && (
                            <span style={{ position: 'absolute', top: -5, right: -5, background: pendingUsers.length > 0 ? '#f59e0b' : 'var(--primary)', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', fontWeight: 'bold' }}>
                                {pendingUsers.length > 0 ? pendingUsers.length : users.length}
                            </span>
                        )}
                    </button>

                    <button className="sketch-panel tool-btn" onClick={handleLogout} title="Exit" style={{ flexShrink: 0 }}>
                        <LogOut size={18} />
                    </button>
                </div>

                {/* Bottom Left Controls */}
                <div className="bottom-controls animate-spring" style={{ animationDelay: '0.3s' }}>
                    <div className="control-group">
                        <button className="tool-btn" onClick={() => window.undoCanvas?.()} title="Undo"><RotateCcw size={18} /></button>
                        <button className="tool-btn" onClick={() => window.redoCanvas?.()} title="Redo"><RotateCw size={18} /></button>
                    </div>
                </div>

                {/* ── Right Side Panel (Chat + Camera + Users) ─── */}
                <div className={`side-panel ${!isSidebarOpen ? 'hidden' : ''}`}>

                    {/* Panel Header */}
                    <div className="chat-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Users size={20} />
                            <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                                Studio ({users.length})
                                {pendingUsers.length > 0 && (
                                    <span style={{ marginLeft: '0.5rem', background: '#fef3c7', color: '#92400e', borderRadius: '10px', padding: '1px 7px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                        {pendingUsers.length} waiting
                                    </span>
                                )}
                            </span>
                        </div>
                        <button className="tool-btn" onClick={() => setSidebarOpen(false)}>
                            <LogOut size={18} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                    </div>

                    {/* ── Camera Strip ──────────────────────────── */}
                    <VideoGrid socket={socket} roomId={roomId} />

                    {/* ── Pending Approval Cards (admin only) ───── */}
                    {(isAdmin || isSocketHost) && pendingUsers.length > 0 && (
                        <div style={{ padding: '0.6rem 1rem', background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#92400e', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Clock size={13} /> Requests to join
                            </p>
                            {pendingUsers.map((pu) => (
                                <div key={pu.socketId} className="pending-user-card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold', flexShrink: 0 }}>
                                            {pu.username.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text)' }}>{pu.username}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <button onClick={() => handleAccept(pu.socketId)} className="admit-btn accept-btn" title="Accept">
                                            <UserCheck size={14} />
                                        </button>
                                        <button onClick={() => handleReject(pu.socketId)} className="admit-btn reject-btn" title="Reject">
                                            <UserX size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Active Users List ──────────────────────── */}
                    <div style={{ padding: '0.5rem 1rem', background: '#f8f9fa', borderBottom: '1px solid #eee', maxHeight: '130px', overflowY: 'auto' }}>
                        {users.map((u, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0', fontSize: '0.85rem' }}>
                                <span style={{ fontWeight: 'bold', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    {u.username}
                                    {u.username === user?.username && <span style={{ color: 'var(--text-dim)', fontWeight: 'normal', fontSize: '0.75rem' }}>(You)</span>}
                                    {i === 0 && <span style={{ color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 'normal' }}>★ host</span>}
                                </span>
                                {isAdmin && u.username !== user?.username && (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={() => handleKick(u.username)} style={{ padding: '2px 8px', fontSize: '0.75rem', background: '#fff5f5', color: '#fa5252', border: '1px solid #ffe6e6', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--doodle-font)' }}>Kick</button>
                                        <button onClick={() => handleBan(u.username)} style={{ padding: '2px 8px', fontSize: '0.75rem', background: '#fa5252', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--doodle-font)' }}>Ban</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ── Chat ──────────────────────────────────── */}
                    <Chat roomId={roomId} socket={socket} onUsersUpdate={setUsers} />
                </div>

            </div>
        </div>
    );
};

export default Whiteboard;
