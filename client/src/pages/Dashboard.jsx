import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const [roomName, setRoomName] = useState('');
    const [joinRoomId, setJoinRoomId] = useState('');
    const [error, setError] = useState('');
    const { token } = useAuth();
    const navigate = useNavigate();

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

    return (
        <div className="centered-page" style={{ background: '#f8f9fa' }}>
            <h1 className="highlighter animate-spring" style={{ fontFamily: 'var(--marker-font)', fontSize: '3.5rem', marginBottom: '0.8rem', color: 'var(--text)' }}>My Sketchbook</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: '3.5rem', fontSize: '1.3rem', fontWeight: 'bold' }}>Floating ideas, sketchy outcomes.</p>

            {error && <p style={{ color: '#fa5252', fontWeight: 'bold', marginBottom: '1.5rem', fontFamily: 'var(--doodle-font)' }}>{error}</p>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', width: '100%', maxWidth: '1000px' }}>
                <div className="sketch-card animate-spring" style={{ animationDelay: '0.1s' }}>
                    <h3 style={{ fontFamily: 'var(--marker-font)', color: 'var(--text)', fontSize: '1.8rem', marginBottom: '1.5rem' }}>Start New</h3>
                    <form onSubmit={handleCreateRoom}>
                        <input
                            type="text"
                            placeholder="Name your board..."
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            required
                            className="sketch-input"
                            style={{ marginBottom: '1.5rem', background: '#f8f9fa', borderRadius: '4px' }}
                        />
                        <button type="submit" className="sketch-button" style={{ width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 'bold', background: '#eef2ff' }}>Create Canvas</button>
                    </form>
                </div>

                <div className="sketch-card animate-spring" style={{ animationDelay: '0.2s' }}>
                    <h3 style={{ fontFamily: 'var(--marker-font)', color: 'var(--text)', fontSize: '1.8rem', marginBottom: '1.5rem' }}>Join Collab</h3>
                    <form onSubmit={handleJoinRoom}>
                        <input
                            type="text"
                            placeholder="Enter Studio ID..."
                            value={joinRoomId}
                            onChange={(e) => setJoinRoomId(e.target.value)}
                            required
                            className="sketch-input"
                            style={{ marginBottom: '1.5rem', background: '#f8f9fa', borderRadius: '4px' }}
                        />
                        <button type="submit" className="sketch-button" style={{ width: '100%', borderColor: 'var(--secondary)', color: 'var(--secondary)', fontWeight: 'bold' }}>Jump In</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
