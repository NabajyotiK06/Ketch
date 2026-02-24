import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout, token } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 2rem',
            background: 'white',
            borderBottom: '1.5px solid #eee',
            position: 'sticky',
            top: 0,
            zIndex: 10
        }}>
            <Link to="/" style={{
                textDecoration: 'none',
                fontFamily: 'var(--marker-font)',
                fontSize: '1.8rem',
                color: 'var(--text)'
            }}>
                Ketch
            </Link>
            <div>
                {token ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>Studio Artist: <span style={{ color: 'var(--text)', fontWeight: 'bold' }}>{user?.username}</span></span>
                        <button onClick={handleLogout} className="sketch-button" style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>Exit</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <Link to="/login" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 'bold' }}>Login</Link>
                        <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Sign Up</Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
