import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const [roomName, setRoomName] = useState('');
    const [joinRoomId, setJoinRoomId] = useState('');
    const [error, setError] = useState('');
    const [myRooms, setMyRooms] = useState([]);
    const [roomsLoading, setRoomsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null); // ID being deleted (for spinner)
    const [confirmDeleteId, setConfirmDeleteId] = useState(null); // ID waiting for confirm
    const { token, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) return;
        axios.get('http://localhost:5000/api/rooms/my-rooms', {
            headers: { 'x-auth-token': token }
        })
            .then(res => setMyRooms(res.data))
            .catch(() => setMyRooms([]))
            .finally(() => setRoomsLoading(false));
    }, [token]);

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        const roomId = Math.random().toString(36).substring(2, 9);
        try {
            await axios.post('http://localhost:5000/api/rooms/create',
                { name: roomName, roomId },
                { headers: { 'x-auth-token': token } }
            );
            navigate(`/room/${roomId}`);
        } catch (err) {
            setError('Failed to create room');
        }
    };

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.get(`http://localhost:5000/api/rooms/${joinRoomId}`);
            if (res.data) {
                navigate(`/room/${joinRoomId}`);
            }
        } catch (err) {
            setError('Room not found');
        }
    };

    const handleDeleteRoom = async (roomId) => {
        if (confirmDeleteId !== roomId) {
            // First click — ask for confirmation
            setConfirmDeleteId(roomId);
            return;
        }
        // Second click — confirmed, proceed with deletion
        setDeletingId(roomId);
        setConfirmDeleteId(null);
        try {
            await axios.delete(`http://localhost:5000/api/rooms/${roomId}`, {
                headers: { 'x-auth-token': token }
            });
            setMyRooms(prev => prev.filter(r => r.roomId !== roomId));
        } catch (err) {
            setError('Failed to delete canvas');
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <>
            {/* ── 3D Ambient Orbs in background ── */}
            <div className="shapes-backdrop" style={{ zIndex: 0 }}>
                <div className="orb orb-purple orb-a" style={{ width: 420, height: 420, top: '-8%', right: '-5%', opacity: 0.3 }} />
                <div className="orb orb-amber orb-b" style={{ width: 320, height: 320, bottom: '10%', left: '-6%', opacity: 0.25 }} />
                <div className="orb orb-teal orb-c" style={{ width: 240, height: 240, top: '40%', left: '30%', opacity: 0.18 }} />
                <div className="ring-deco" style={{ width: 200, height: 200, top: '5%', left: '10%', color: 'rgba(105,101,219,0.1)', animationDuration: '14s' }} />
                <div className="ring-deco" style={{ width: 140, height: 140, bottom: '15%', right: '8%', color: 'rgba(245,158,11,0.12)', animationDelay: '2s', animationDuration: '11s' }} />
            </div>

            <div className="dashboard-page">

                {/* ── Hero greeting ── */}
                <div className="dashboard-greeting animate-spring">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        <h1 className="dashboard-title" style={{ margin: 0 }}>
                            Hey,{' '}
                            <span style={{
                                background: 'linear-gradient(135deg, var(--primary), #9333ea)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}>{user?.username || 'Artist'}</span>
                            {' '}✏️
                        </h1>
                        <span className="badge-3d" style={{ alignSelf: 'center' }}>🎨 Studio</span>
                    </div>
                    <p className="dashboard-subtitle">Your sketchbook awaits. What are we making today?</p>
                </div>

                {error && (
                    <p className="dashboard-error animate-spring">{error}</p>
                )}

                {/* ── Create / Join ── */}
                <div className="dashboard-actions animate-spring" style={{ animationDelay: '0.1s' }}>
                    {/* Create */}
                    <div className="dash-action-card">
                        <div className="dash-action-icon">🆕</div>
                        <h3 className="dash-action-title">Start New Canvas</h3>
                        <p className="dash-action-desc">Blank slate, infinite possibilities.</p>
                        <form onSubmit={handleCreateRoom}>
                            <input
                                type="text"
                                placeholder="Name your canvas…"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                required
                                className="sketch-input"
                                style={{ marginBottom: '1rem', borderRadius: '12px', border: '1.5px solid rgba(105,101,219,0.15)' }}
                            />
                            <button type="submit" className="dash-btn-primary glow-btn" style={{ width: '100%' }}>
                                Create Canvas 🚀
                            </button>
                        </form>
                    </div>

                    {/* Join */}
                    <div className="dash-action-card">
                        <div className="dash-action-icon">🤝</div>
                        <h3 className="dash-action-title">Join a Session</h3>
                        <p className="dash-action-desc">Got an invite link or Studio ID?</p>
                        <form onSubmit={handleJoinRoom}>
                            <input
                                type="text"
                                placeholder="Enter Studio ID…"
                                value={joinRoomId}
                                onChange={(e) => { setJoinRoomId(e.target.value); setError(''); }}
                                required
                                className="sketch-input"
                                style={{ marginBottom: '1rem', borderRadius: '12px', border: '1.5px solid rgba(105,101,219,0.15)' }}
                            />
                            <button type="submit" className="dash-btn-secondary" style={{ width: '100%' }}>
                                Jump In ⚡
                            </button>
                        </form>
                    </div>
                </div>

                {/* ── Previous Sessions ── */}
                <div className="dashboard-sessions animate-spring" style={{ animationDelay: '0.2s' }}>
                    <h2 className="dashboard-sessions-title">
                        📂 Your Sessions
                        <span className="dashboard-sessions-count">{myRooms.length}</span>
                    </h2>

                    {roomsLoading ? (
                        <div className="dashboard-sessions-empty">
                            <div className="join-waiting-dots" style={{ marginTop: 0 }}>
                                <span /><span /><span />
                            </div>
                        </div>
                    ) : myRooms.length === 0 ? (
                        <div className="dashboard-sessions-empty" style={{
                            background: 'rgba(255,255,255,0.7)',
                            backdropFilter: 'blur(12px)',
                            border: '1.5px dashed rgba(105,101,219,0.2)',
                        }}>
                            <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '0.5rem', animation: 'breathe 2.5s ease-in-out infinite' }}>🎨</span>
                            <p>No canvases yet. Create one above to get started!</p>
                        </div>
                    ) : (
                        <div className="dashboard-sessions-grid">
                            {myRooms.map((room, i) => (
                                <div key={room.roomId}
                                    className="session-card animate-spring"
                                    style={{ animationDelay: `${i * 0.06}s` }}
                                    onClick={() => {
                                        // Don't navigate if clicking delete area
                                        if (confirmDeleteId === room.roomId) return;
                                        navigate(`/room/${room.roomId}`);
                                    }}
                                >
                                    {/* Canvas Thumbnail */}
                                    <div className="session-thumb" style={{ position: 'relative' }}>
                                        {room.canvasData ? (
                                            <img src={room.canvasData} alt="canvas preview"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div className="session-thumb-placeholder">
                                                <span>✏️</span>
                                            </div>
                                        )}
                                        {/* Shimmer overlay */}
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(105,101,219,0.06) 100%)',
                                            pointerEvents: 'none',
                                        }} />
                                    </div>

                                    {/* Card Info */}
                                    <div className="session-card-body">
                                        <div className="session-card-meta">
                                            <p className="session-card-name">{room.name}</p>
                                            <p className="session-card-date">📅 {formatDate(room.createdAt)}</p>
                                        </div>
                                        <div className="session-card-id">ID: {room.roomId}</div>

                                        {/* Buttons row */}
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                                            <button
                                                className="session-resume-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDeleteId(null);
                                                    navigate(`/room/${room.roomId}`);
                                                }}
                                            >
                                                Resume →
                                            </button>

                                            {/* Delete button — two-stage confirm */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteRoom(room.roomId);
                                                }}
                                                disabled={deletingId === room.roomId}
                                                title={confirmDeleteId === room.roomId ? 'Click again to confirm' : 'Delete canvas'}
                                                style={{
                                                    fontFamily: 'var(--doodle-font)',
                                                    fontSize: '0.82rem',
                                                    fontWeight: 'bold',
                                                    background: confirmDeleteId === room.roomId ? '#dc2626' : '#fee2e2',
                                                    color: confirmDeleteId === room.roomId ? 'white' : '#dc2626',
                                                    border: '1.5px solid #fca5a5',
                                                    borderRadius: '6px',
                                                    padding: '0.3rem 0.7rem',
                                                    cursor: 'pointer',
                                                    flexShrink: 0,
                                                    transition: 'all 0.2s ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                }}
                                            >
                                                {deletingId === room.roomId
                                                    ? '…'
                                                    : confirmDeleteId === room.roomId
                                                        ? '⚠ Confirm'
                                                        : '🗑'}
                                            </button>
                                        </div>

                                        {/* Cancel confirm hint */}
                                        {confirmDeleteId === room.roomId && (
                                            <p style={{
                                                fontSize: '0.72rem', color: '#dc2626', margin: '0.3rem 0 0',
                                                fontFamily: 'var(--doodle-font)', animation: 'fade-up 0.2s ease',
                                            }}>
                                                Click "⚠ Confirm" to permanently delete, or click elsewhere to cancel.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Click outside to cancel delete confirm */}
            {confirmDeleteId && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 0 }}
                    onClick={() => setConfirmDeleteId(null)}
                />
            )}
        </>
    );
};

export default Dashboard;
