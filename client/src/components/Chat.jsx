import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const Chat = ({ roomId, onUsersUpdate }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const socketRef = useRef(null);
    const { user } = useAuth();
    const messagesEndRef = useRef(null);

    useEffect(() => {
        socketRef.current = io('http://localhost:5000');
        socketRef.current.emit('join-room', { roomId, username: user?.username || 'Anonymous' });

        socketRef.current.on('receive-message', (data) => {
            setMessages((prev) => [...prev, data]);
        });

        socketRef.current.on('update-users', (userList) => {
            if (onUsersUpdate) {
                onUsersUpdate(userList);
            }
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, [roomId, user, onUsersUpdate]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        const msgData = {
            roomId,
            message,
            user: user?.username || 'Anonymous',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        socketRef.current.emit('send-message', msgData);
        setMessages((prev) => [...prev, msgData]);
        setMessage('');
    };

    return (
        <div className="chat-container" style={{ fontFamily: 'var(--doodle-font)' }}>
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} style={{ marginBottom: '1.5rem', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', padding: '0 0.4rem', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 'bold' }}>{msg.user}</span>
                            <span style={{ color: 'var(--text-dim)' }}>{msg.time}</span>
                        </div>
                        <div className="animate-spring" style={{
                            padding: '0.8rem 1.2rem',
                            border: '1.5px solid #eee',
                            borderRadius: index % 2 === 0 ? '20px 5px 20px 5px / 5px 20px 5px 20px' : '5px 20px 5px 20px / 20px 5px 20px 5px',
                            background: index % 2 === 0 ? 'rgba(105, 101, 219, 0.08)' : 'rgba(173, 181, 189, 0.08)',
                            fontSize: '0.95rem',
                            width: 'fit-content',
                            maxWidth: '90%',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                            borderLeft: index % 2 === 0 ? '3px solid var(--primary)' : '1.5px solid #eee'
                        }}>
                            {msg.message}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="chat-input-box">
                <input
                    type="text"
                    placeholder="Wanna say something?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="sketch-input"
                    style={{ background: '#f8f9fa', fontSize: '0.9rem' }}
                />
            </form>
        </div>
    );
};

export default Chat;
