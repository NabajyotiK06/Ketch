import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const res = await login(email, password);
        if (res.success) {
            navigate('/dashboard');
        } else {
            setError(res.message);
        }
    };

    return (
        <div className="centered-page" style={{ background: '#f8f9fa' }}>
            <div className="sketch-card animate-spring" style={{ width: '100%', maxWidth: '400px', transform: 'none', padding: '3rem' }}>
                <h2 className="highlighter" style={{ fontFamily: 'var(--marker-font)', textAlign: 'center', fontSize: '2.4rem', marginBottom: '2rem', color: 'var(--text)' }}>Studio Login</h2>
                {error && <p style={{ color: '#fa5252', textAlign: 'center', fontWeight: 'bold', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>Scribbler Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="sketch-input"
                            style={{ background: '#f8f9fa', borderRadius: '4px' }}
                        />
                    </div>
                    <div style={{ marginBottom: '2.5rem', textAlign: 'left' }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>Secret Passphrase</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="sketch-input"
                            style={{ background: '#f8f9fa', borderRadius: '4px' }}
                        />
                    </div>
                    <button type="submit" className="sketch-button" style={{ width: '100%', fontSize: '1.2rem', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 'bold', background: '#eef2ff' }}>Enter Studio</button>
                    <p style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '1rem', color: 'var(--text-dim)' }}>
                        No sketchbook yet? <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Create account</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;
