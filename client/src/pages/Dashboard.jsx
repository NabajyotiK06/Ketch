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
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Dashboard</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
                <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3>Create a New Room</h3>
                    <form onSubmit={handleCreateRoom}>
                        <input
                            type="text"
                            placeholder="Board Name"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                        />
                        <button type="submit" style={{ width: '100%', background: 'var(--primary)', color: 'white' }}>Create & Join</button>
                    </form>
                </div>

                <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3>Join Existing Room</h3>
                    <form onSubmit={handleJoinRoom}>
                        <input
                            type="text"
                            placeholder="Room ID"
                            value={joinRoomId}
                            onChange={(e) => setJoinRoomId(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                        />
                        <button type="submit" style={{ width: '100%', background: 'var(--secondary)', color: 'white' }}>Join Room</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
