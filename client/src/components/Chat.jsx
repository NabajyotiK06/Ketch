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
        <div className="chat-box">
            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold' }}>
                Room Chat
            </div>
            <div className="messages" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {messages.map((msg, index) => (
                    <div key={index} style={{ marginBottom: '0.8rem' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.8rem' }}>{msg.user}</span>
                        <span style={{ float: 'right', fontSize: '0.7rem', color: '#94a3b8' }}>{msg.time}</span>
                        <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', marginTop: '0.2rem' }}>
                            {msg.message}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="message-input">
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                />
            </form>
        </div>
    );
};

export default Chat;
