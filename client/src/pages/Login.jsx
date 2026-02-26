import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Shared orb backdrop for auth pages
const AuthOrbs = () => (
    <div className="shapes-backdrop">
        <div className="orb orb-purple orb-a" style={{ width: 500, height: 500, top: '-10%', left: '-10%', opacity: 0.6 }} />
        <div className="orb orb-amber orb-b" style={{ width: 380, height: 380, bottom: '-5%', right: '-8%', opacity: 0.5 }} />
        <div className="orb orb-teal orb-c" style={{ width: 260, height: 260, top: '40%', right: '5%', opacity: 0.4 }} />
        <div className="orb orb-rose orb-a" style={{ width: 200, height: 200, bottom: '20%', left: '5%', opacity: 0.35, animationDuration: '16s' }} />
        {/* Floating rings */}
        <div className="ring-deco" style={{ width: 160, height: 160, top: '15%', right: '15%', color: 'rgba(105,101,219,0.15)', animationDuration: '10s' }} />
        <div className="ring-deco" style={{ width: 100, height: 100, bottom: '20%', left: '20%', color: 'rgba(245,158,11,0.2)', animationDelay: '3s', animationDuration: '13s' }} />
        <div className="ring-deco" style={{ width: 220, height: 220, top: '55%', left: '8%', color: 'rgba(16,185,129,0.12)', animationDelay: '1.5s', animationDuration: '16s' }} />
    </div>
);

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
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            position: 'relative',
            background: 'linear-gradient(-45deg, #eef2ff, #f0fdf4, #fef9ee, #fdf2f8)',
            backgroundSize: '400% 400%',
            animation: 'mesh-shift 12s ease infinite',
        }}>
            <AuthOrbs />

            {/* 3D Art decoration beside card */}
            <div style={{ position: 'absolute', top: '12%', left: '8%', fontSize: '4rem', animation: 'pencil-float 4s ease-in-out infinite alternate', zIndex: 1, display: 'none' }} className="auth-deco-pencil">✏️</div>

            <div className="animate-spring glass-card" style={{
                width: '100%', maxWidth: '420px',
                borderRadius: '28px',
                padding: '3rem',
                position: 'relative',
                zIndex: 2,
                overflow: 'hidden',
            }}>
                {/* Top gradient bar */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                    background: 'linear-gradient(90deg, #6965db, #9333ea, #f59e0b)',
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
                        background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                        boxShadow: '0 6px 20px rgba(105,101,219,0.22), inset 0 1px 0 rgba(255,255,255,0.9)',
                        fontSize: '2rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        animation: 'breathe 3s ease-in-out infinite',
                    }}>✏️</span>
                </div>

                <h2 style={{
                    fontFamily: 'var(--marker-font)', textAlign: 'center',
                    fontSize: '2rem', marginBottom: '0.3rem', color: 'var(--text)',
                    background: 'linear-gradient(135deg, var(--primary), #9333ea)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}>Studio Login</h2>
                <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'var(--doodle-font)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                    Welcome back, artist 🎨
                </p>

                {error && <p style={{ color: '#fa5252', textAlign: 'center', fontWeight: 'bold', marginBottom: '1.5rem', fontSize: '0.9rem', padding: '0.6rem 1rem', background: '#fff5f5', borderRadius: '10px', border: '1px solid #ffa8a8' }}>{error}</p>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.2rem', textAlign: 'left' }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '0.88rem', color: 'var(--text-dim)', fontFamily: 'var(--doodle-font)' }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="sketch-input"
                            placeholder="you@example.com"
                            style={{ background: 'rgba(248,249,250,0.8)', borderRadius: '12px', border: '1.5px solid rgba(105,101,219,0.15)', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        />
                    </div>
                    <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '0.88rem', color: 'var(--text-dim)', fontFamily: 'var(--doodle-font)' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="sketch-input"
                            placeholder="••••••••"
                            style={{ background: 'rgba(248,249,250,0.8)', borderRadius: '12px', border: '1.5px solid rgba(105,101,219,0.15)', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        />
                    </div>
                    <button type="submit" className="landing-cta-btn glow-btn" style={{ width: '100%', justifyContent: 'center' }}>
                        Enter Studio 🚀
                    </button>
                    <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-dim)', fontFamily: 'var(--doodle-font)' }}>
                        No sketchbook yet?{' '}
                        <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Create account</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;
