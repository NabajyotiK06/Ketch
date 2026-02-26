import { useState, useEffect, useRef } from 'react';
import { Paperclip, Download, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Chat now accepts the parent `socket` prop so it reuses the
 * same Socket.IO connection as Whiteboard — no duplicate connections.
 */
const Chat = ({ roomId, socket, onUsersUpdate }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const { user } = useAuth();
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (data) => setMessages(prev => [...prev, data]);
        const handleFile = (data) => setMessages(prev => [...prev, data]);
        const handleUsers = (userList) => { if (onUsersUpdate) onUsersUpdate(userList); };

        socket.on('receive-message', handleMessage);
        socket.on('receive-file', handleFile);
        socket.on('update-users', handleUsers);

        return () => {
            socket.off('receive-message', handleMessage);
            socket.off('receive-file', handleFile);
            socket.off('update-users', handleUsers);
        };
    }, [socket, onUsersUpdate]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || !socket) return;

        const msgData = {
            roomId,
            message,
            user: user?.username || 'Anonymous',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text'
        };

        socket.emit('send-message', msgData);
        setMessages(prev => [...prev, msgData]);
        setMessage('');
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('File size exceeds 5MB limit.'); return; }

        const reader = new FileReader();
        reader.onload = (event) => {
            const fileMsgData = {
                roomId,
                user: user?.username || 'Anonymous',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'file',
                fileData: event.target.result,
                fileName: file.name
            };
            socket.emit('send-file', fileMsgData);
            setMessages(prev => [...prev, fileMsgData]);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const myUsername = user?.username || 'Anonymous';

    return (
        <div className="chat-container" style={{ fontFamily: 'var(--doodle-font)' }}>
            <div className="chat-messages">
                {messages.map((msg, index) => {
                    const isOwn = msg.user === myUsername;
                    return (
                        <div key={index} style={{ marginBottom: '1.2rem', width: '100%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.2rem', padding: '0 0.4rem', fontSize: '0.8rem' }}>
                                <span style={{ fontWeight: 'bold', color: isOwn ? 'var(--primary)' : 'var(--text)' }}>{msg.user}</span>
                                <span style={{ color: 'var(--text-dim)' }}>{msg.time}</span>
                            </div>
                            <div style={{
                                padding: '0.7rem 1rem',
                                border: '1.5px solid #eee',
                                borderRadius: isOwn ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                                background: isOwn ? 'rgba(105, 101, 219, 0.1)' : '#f9fafb',
                                fontSize: '0.9rem',
                                maxWidth: '88%',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                borderLeft: isOwn ? '3px solid var(--primary)' : '1.5px solid #eee',
                            }}>
                                {msg.type === 'file' ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Paperclip size={15} />
                                        <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={msg.fileName}>{msg.fileName}</span>
                                        <a href={msg.fileData} download={msg.fileName} style={{ color: 'var(--primary)', cursor: 'pointer' }} title="Download">
                                            <Download size={16} />
                                        </a>
                                    </div>
                                ) : msg.message}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="chat-input-box" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="Write something…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="sketch-input"
                    style={{ background: '#f8f9fa', fontSize: '0.88rem', flex: 1 }}
                />
                {/* Label-based file trigger — most reliable cross-browser approach */}
                <label
                    htmlFor="chat-file-input"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                    title="Attach File (Max 5MB)"
                >
                    <Paperclip size={18} />
                </label>
                <input
                    id="chat-file-input"
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                />
                <button type="submit" style={{ background: 'var(--primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Send">
                    <Send size={15} />
                </button>
            </form>
        </div>
    );
};

export default Chat;
