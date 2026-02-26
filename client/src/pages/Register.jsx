import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Shared orb backdrop
const AuthOrbs = () => (
    <div className="shapes-backdrop">
        <div className="orb orb-teal orb-b" style={{ width: 480, height: 480, top: '-8%', left: '-8%', opacity: 0.55 }} />
        <div className="orb orb-purple orb-a" style={{ width: 360, height: 360, bottom: '-5%', right: '-6%', opacity: 0.5 }} />
        <div className="orb orb-amber orb-c" style={{ width: 240, height: 240, top: '35%', right: '8%', opacity: 0.4 }} />
        <div className="orb orb-sky orb-b" style={{ width: 180, height: 180, bottom: '25%', left: '8%', opacity: 0.35, animationDuration: '14s' }} />
        <div className="ring-deco" style={{ width: 180, height: 180, top: '10%', right: '18%', color: 'rgba(16,185,129,0.17)', animationDuration: '11s' }} />
        <div className="ring-deco" style={{ width: 120, height: 120, bottom: '15%', left: '15%', color: 'rgba(105,101,219,0.18)', animationDelay: '2s', animationDuration: '14s' }} />
        <div className="ring-deco" style={{ width: 240, height: 240, top: '50%', left: '5%', color: 'rgba(245,158,11,0.12)', animationDelay: '1s', animationDuration: '18s' }} />
    </div>
);

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const res = await register(username, email, password);
        if (res.success) {
            navigate('/dashboard');
        } else {
            setError(res.message);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            position: 'relative',
            background: 'linear-gradient(-45deg, #f0fdf4, #eef2ff, #fdf2f8, #fef9ee)',
            backgroundSize: '400% 400%',
            animation: 'mesh-shift 14s ease infinite',
        }}>
            <AuthOrbs />

            <div className="animate-spring glass-card" style={{
                width: '100%', maxWidth: '440px',
                borderRadius: '28px',
                padding: '3rem',
                position: 'relative',
                zIndex: 2,
                overflow: 'hidden',
            }}>
                {/* Top gradient bar */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                    background: 'linear-gradient(90deg, #10b981, #6965db, #9333ea)',
                    borderRadius: '28px 28px 0 0',
                }} />

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '64px', height: '64px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                        boxShadow: '0 6px 20px rgba(16,185,129,0.22), inset 0 1px 0 rgba(255,255,255,0.9)',
                        fontSize: '2rem',
                        animation: 'breathe 3.5s ease-in-out infinite',
                    }}>🎨</span>
                </div>

                <h2 style={{
                    fontFamily: 'var(--marker-font)', textAlign: 'center',
                    fontSize: '2rem', marginBottom: '0.3rem', color: 'var(--text)',
                    background: 'linear-gradient(135deg, #10b981, #6965db)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}>Start Sketching</h2>
                <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'var(--doodle-font)', fontSize: '0.9rem', marginBottom: '1.8rem' }}>
                    Create your free studio account ✨
                </p>

                {error && <p style={{ color: '#fa5252', textAlign: 'center', fontWeight: 'bold', marginBottom: '1rem', fontSize: '0.9rem', padding: '0.6rem 1rem', background: '#fff5f5', borderRadius: '10px', border: '1px solid #ffa8a8' }}>{error}</p>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.4rem', fontSize: '0.88rem', color: 'var(--text-dim)', fontFamily: 'var(--doodle-font)' }}>Alias / Pen Name</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="sketch-input"
                            placeholder="Your artist name…"
                            style={{ background: 'rgba(248,249,250,0.8)', borderRadius: '12px', border: '1.5px solid rgba(16,185,129,0.15)' }}
                        />
                    </div>
                    <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.4rem', fontSize: '0.88rem', color: 'var(--text-dim)', fontFamily: 'var(--doodle-font)' }}>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="sketch-input"
                            placeholder="you@example.com"
                            style={{ background: 'rgba(248,249,250,0.8)', borderRadius: '12px', border: '1.5px solid rgba(16,185,129,0.15)' }}
                        />
                    </div>
                    <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.4rem', fontSize: '0.88rem', color: 'var(--text-dim)', fontFamily: 'var(--doodle-font)' }}>Secret Passphrase</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="sketch-input"
                            placeholder="••••••••"
                            style={{ background: 'rgba(248,249,250,0.8)', borderRadius: '12px', border: '1.5px solid rgba(16,185,129,0.15)' }}
                        />
                    </div>
                    <button type="submit" className="landing-cta-btn glow-btn" style={{
                        width: '100%', justifyContent: 'center',
                        background: 'linear-gradient(135deg, #10b981, #6965db)',
                    }}>
                        Join the Studio 🎨
                    </button>
                    <p style={{ marginTop: '1.8rem', textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-dim)', fontFamily: 'var(--doodle-font)' }}>
                        Already an artist?{' '}
                        <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Sign In</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Register;
