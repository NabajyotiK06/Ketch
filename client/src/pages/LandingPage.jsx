import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Doodle SVG Decorations ────────────────────────────────────
const Squiggle = ({ style }) => (
    <svg viewBox="0 0 120 24" style={{ position: 'absolute', ...style }} xmlns="http://www.w3.org/2000/svg">
        <path d="M4 12 Q14 4 24 12 Q34 20 44 12 Q54 4 64 12 Q74 20 84 12 Q94 4 104 12 Q114 20 120 12"
            stroke="var(--primary)" strokeWidth="3" fill="none" strokeLinecap="round"
            strokeDasharray="200" strokeDashoffset="200">
            <animate attributeName="stroke-dashoffset" from="200" to="0" dur="1.2s" fill="freeze" begin="0.3s" />
        </path>
    </svg>
);

const Circle = ({ style, color = 'var(--primary)', size = 60, delay = '0s' }) => (
    <svg viewBox="0 0 100 100" style={{ position: 'absolute', width: size, height: size, ...style }} xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="40" stroke={color} strokeWidth="4" fill="none"
            strokeDasharray="251" strokeDashoffset="251">
            <animate attributeName="stroke-dashoffset" from="251" to="0" dur="1s" fill="freeze" begin={delay} />
        </circle>
    </svg>
);

const StarDoodle = ({ style, delay = '0s' }) => (
    <svg viewBox="0 0 50 50" style={{ position: 'absolute', width: 40, height: 40, ...style }} xmlns="http://www.w3.org/2000/svg">
        <polygon points="25,5 30,18 44,18 33,27 37,41 25,32 13,41 17,27 6,18 20,18"
            stroke="#f59e0b" strokeWidth="2.5" fill="none"
            strokeDasharray="200" strokeDashoffset="200">
            <animate attributeName="stroke-dashoffset" from="200" to="0" dur="1.4s" fill="freeze" begin={delay} />
        </polygon>
    </svg>
);

const Arrow = ({ style, delay = '0s' }) => (
    <svg viewBox="0 0 80 30" style={{ position: 'absolute', width: 80, ...style }} xmlns="http://www.w3.org/2000/svg">
        <path d="M4 15 Q30 5 60 15 L50 8 M60 15 L50 22"
            stroke="var(--secondary)" strokeWidth="2.5" fill="none" strokeLinecap="round"
            strokeDasharray="120" strokeDashoffset="120">
            <animate attributeName="stroke-dashoffset" from="120" to="0" dur="1s" fill="freeze" begin={delay} />
        </path>
    </svg>
);

const FloatingPencil = ({ style, delay }) => (
    <div style={{
        position: 'absolute',
        fontSize: '2rem',
        animation: `pencil-float 3s ease-in-out ${delay} infinite alternate`,
        ...style
    }}>✏️</div>
);

// ── 3D Floating Orbs Background ─────────────────────────────────
const OrbsBackground = () => (
    <>
        <div className="orb orb-purple orb-a" style={{ width: 400, height: 400, top: '5%', left: '-5%', opacity: 0.7 }} />
        <div className="orb orb-amber orb-b" style={{ width: 320, height: 320, top: '60%', right: '-8%', opacity: 0.6 }} />
        <div className="orb orb-teal orb-c" style={{ width: 280, height: 280, bottom: '5%', left: '20%', opacity: 0.5 }} />
        <div className="orb orb-rose orb-a" style={{ width: 200, height: 200, top: '35%', right: '25%', opacity: 0.4, animationDuration: '20s' }} />
    </>
);

// ── Feature Card ────────────────────────────────────────────────
const FeatureCard = ({ emoji, title, desc, delay }) => (
    <div className="landing-feature-card" style={{ animationDelay: delay }}>
        <div className="landing-feature-icon">{emoji}</div>
        <h3 className="landing-feature-title">{title}</h3>
        <p className="landing-feature-desc">{desc}</p>
    </div>
);

// ── Animated Canvas Preview ─────────────────────────────────────
const CanvasPreview = () => {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        const strokes = [
            { color: '#6965db', size: 3, points: [[40, 80], [70, 60], [110, 90], [150, 55], [190, 80]] },
            { color: '#f59e0b', size: 2.5, points: [[60, 140], [100, 110], [140, 145], [180, 120], [220, 150]] },
            { color: '#10b981', size: 3, points: [[30, 180], [80, 160], [130, 185], [180, 165], [230, 180]] },
        ];
        const shapes = [
            { type: 'rect', x: 250, y: 60, w: 80, h: 60, color: '#6965db' },
            { type: 'circle', x: 310, y: 160, r: 35, color: '#f59e0b' },
            { type: 'star', x: 260, y: 200, color: '#10b981' },
        ];
        const texts = [
            { text: 'Ideas!', x: 40, y: 40, color: '#6965db' },
            { text: '✨ collab', x: 240, y: 30, color: '#f59e0b' },
        ];

        ctx.clearRect(0, 0, W, H);
        ctx.font = 'bold 18px "Permanent Marker", cursive';
        texts.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.fillText(t.text, t.x, t.y);
        });

        strokes.forEach(s => {
            ctx.beginPath();
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(s.points[0][0], s.points[0][1]);
            s.points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
            ctx.stroke();
        });

        ctx.strokeStyle = shapes[0].color; ctx.lineWidth = 2.5;
        ctx.strokeRect(shapes[0].x, shapes[0].y, shapes[0].w, shapes[0].h);
        ctx.beginPath(); ctx.strokeStyle = shapes[1].color; ctx.lineWidth = 2.5;
        ctx.arc(shapes[1].x, shapes[1].y, shapes[1].r, 0, Math.PI * 2); ctx.stroke();
        ctx.font = '28px serif'; ctx.fillStyle = shapes[2].color;
        ctx.fillText('⭐', shapes[2].x, shapes[2].y);
    }, []);

    return (
        <canvas ref={canvasRef} width={380} height={230}
            style={{ borderRadius: '12px', display: 'block', width: '100%', height: 'auto', background: 'white' }} />
    );
};

// ── Main Landing Page ───────────────────────────────────────────
const LandingPage = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="landing-page">
            {/* ── Navbar ── */}
            <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
                <span className="landing-nav-logo">Ketch ✏️</span>
                <div className="landing-nav-links">
                    {token ? (
                        <button className="landing-btn-primary glow-btn" onClick={() => navigate('/dashboard')}>
                            My Sketchbook →
                        </button>
                    ) : (
                        <>
                            <Link to="/login" className="landing-nav-link">Log in</Link>
                            <Link to="/register" className="landing-btn-primary glow-btn">Get Started Free</Link>
                        </>
                    )}
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className="landing-hero">
                {/* 3D Floating orbs */}
                <OrbsBackground />

                {/* Floating doodle decorations */}
                <FloatingPencil style={{ top: '12%', left: '6%', zIndex: 1 }} delay="0s" />
                <FloatingPencil style={{ top: '25%', right: '8%', zIndex: 1 }} delay="0.7s" />
                <FloatingPencil style={{ bottom: '20%', left: '4%', zIndex: 1 }} delay="1.4s" />

                <Circle style={{ top: '8%', right: '15%', zIndex: 1 }} color="#6965db" size={70} delay="0.4s" />
                <Circle style={{ bottom: '15%', left: '12%', zIndex: 1 }} color="#f59e0b" size={50} delay="0.8s" />

                <StarDoodle style={{ top: '30%', right: '5%', zIndex: 1 }} delay="0.6s" />
                <StarDoodle style={{ bottom: '28%', right: '14%', zIndex: 1 }} delay="1.1s" />

                <Arrow style={{ top: '55%', left: '3%', transform: 'rotate(-20deg)', zIndex: 1 }} delay="0.9s" />

                {/* 3D floating ring decorations */}
                <div className="ring-deco" style={{ width: 120, height: 120, top: '15%', right: '30%', color: 'rgba(105,101,219,0.2)', animationDelay: '0s', zIndex: 0 }} />
                <div className="ring-deco" style={{ width: 80, height: 80, bottom: '25%', left: '15%', color: 'rgba(245,158,11,0.25)', animationDelay: '2s', animationDuration: '10s', zIndex: 0 }} />
                <div className="ring-deco" style={{ width: 160, height: 160, top: '50%', left: '30%', color: 'rgba(16,185,129,0.15)', animationDelay: '1s', animationDuration: '14s', zIndex: 0 }} />

                <div className="landing-hero-content" style={{ position: 'relative', zIndex: 2 }}>
                    <div className="landing-hero-badge animate-spring">🎨 Real-time collaborative whiteboard</div>

                    <h1 className="landing-hero-title animate-spring" style={{ animationDelay: '0.1s' }}>
                        Where great ideas
                        <span className="landing-hero-underline">
                            <Squiggle style={{ bottom: '-8px', left: 0, width: '100%', height: '24px' }} />
                            {' '}get sketched.
                        </span>
                    </h1>

                    <p className="landing-hero-sub animate-spring" style={{ animationDelay: '0.2s' }}>
                        Ketch is your infinite canvas for brainstorming, wireframing,
                        and collaborating with your team — <em>in real time</em>.
                    </p>

                    <div className="landing-hero-cta animate-spring" style={{ animationDelay: '0.3s' }}>
                        {token ? (
                            <button className="landing-cta-btn glow-btn" onClick={() => navigate('/dashboard')}>
                                Open My Sketchbook ✏️
                            </button>
                        ) : (
                            <>
                                <Link to="/register" className="landing-cta-btn glow-btn">
                                    Start Sketching Free 🚀
                                </Link>
                                <Link to="/login" className="landing-cta-ghost">
                                    I already have an account
                                </Link>
                            </>
                        )}
                    </div>

                    {/* 3D stats row */}
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
                        {[
                            { num: '10k+', label: 'Sessions' },
                            { num: '∞', label: 'Canvas size' },
                            { num: '0ms', label: 'Sync delay' },
                        ].map(s => (
                            <div key={s.label} style={{
                                background: 'rgba(255,255,255,0.75)',
                                backdropFilter: 'blur(12px)',
                                border: '1.5px solid rgba(105,101,219,0.15)',
                                borderRadius: '14px',
                                padding: '0.6rem 1.2rem',
                                boxShadow: '0 4px 14px rgba(105,101,219,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minWidth: '80px',
                                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(105,101,219,0.2)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 14px rgba(105,101,219,0.1), inset 0 1px 0 rgba(255,255,255,0.9)'; }}
                            >
                                <span style={{ fontFamily: 'var(--marker-font)', fontSize: '1.4rem', color: 'var(--primary)', lineHeight: 1 }}>{s.num}</span>
                                <span style={{ fontFamily: 'var(--doodle-font)', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Canvas Preview Card ── */}
                <div className="landing-hero-preview animate-spring" style={{ animationDelay: '0.4s', position: 'relative', zIndex: 2 }}>
                    <div className="landing-preview-card">
                        <div className="landing-preview-toolbar">
                            <span className="lpt-dot" style={{ background: '#ff5f57' }} />
                            <span className="lpt-dot" style={{ background: '#febc2e' }} />
                            <span className="lpt-dot" style={{ background: '#28c840' }} />
                            <span style={{ flex: 1 }} />
                            <span className="lpt-label">ketch.io · live session</span>
                        </div>
                        <CanvasPreview />
                        <div className="landing-preview-users">
                            {['A', 'B', 'C'].map((l, i) => (
                                <div key={l} className="landing-preview-avatar" style={{ background: ['#6965db', '#f59e0b', '#10b981'][i] }}>
                                    {l}
                                </div>
                            ))}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--doodle-font)' }}>3 drawing live…</span>
                        </div>
                    </div>

                    {/* Floating 3D badge behind card */}
                    <div className="badge-3d animate-spring" style={{ position: 'absolute', bottom: '-16px', right: '16px', animationDelay: '0.8s', zIndex: 10 }}>
                        ⚡ Live sync
                    </div>
                    <div className="badge-3d animate-spring" style={{
                        position: 'absolute', top: '-14px', left: '16px', animationDelay: '1s', zIndex: 10,
                        background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                    }}>
                        🎨 Now drawing
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section className="landing-features" style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Subtle orbs in features section */}
                <div className="orb orb-purple orb-c" style={{ width: 300, height: 300, top: '-10%', right: '-5%', opacity: 0.25 }} />
                <div className="orb orb-teal orb-a" style={{ width: 250, height: 250, bottom: '-5%', left: '-5%', opacity: 0.2 }} />

                <h2 className="landing-section-title" style={{ position: 'relative', zIndex: 1 }}>
                    Everything you need to
                    <span className="landing-highlight"> think together</span>
                </h2>
                <p className="landing-section-sub" style={{ position: 'relative', zIndex: 1 }}>No installs. No friction. Just draw.</p>

                <div className="landing-features-grid" style={{ position: 'relative', zIndex: 1 }}>
                    <FeatureCard emoji="⚡" title="Real-time sync" desc="Every stroke appears instantly for all collaborators. No refresh needed." delay="0s" />
                    <FeatureCard emoji="🎥" title="Video & screen share" desc="See your team's faces while you sketch. Share your screen mid-session." delay="0.1s" />
                    <FeatureCard emoji="🔒" title="Host controls" desc="Approve joiners, kick bad actors, full admin control of your studio." delay="0.2s" />
                    <FeatureCard emoji="💬" title="Built-in chat" desc="Talk it out without leaving the canvas. Chat lives right in your studio." delay="0.3s" />
                    <FeatureCard emoji="🗂️" title="Session history" desc="Every canvas is saved. Resume where you left off, anytime." delay="0.4s" />
                    <FeatureCard emoji="📐" title="Rich toolset" desc="Pencil, shapes, arrows, text, eraser — everything an artist could want." delay="0.5s" />
                </div>
            </section>

            {/* ── How it works ── */}
            <section className="landing-how" style={{ position: 'relative', overflow: 'hidden' }}>
                <div className="orb orb-amber orb-b" style={{ width: 350, height: 350, top: '20%', right: '-8%', opacity: 0.3 }} />
                <div className="orb orb-sky orb-c" style={{ width: 280, height: 280, bottom: '10%', left: '-6%', opacity: 0.25 }} />

                <h2 className="landing-section-title" style={{ position: 'relative', zIndex: 1 }}>Get started in seconds</h2>
                <div className="landing-how-steps" style={{ position: 'relative', zIndex: 1 }}>
                    {[
                        { n: '01', title: 'Create a session', desc: 'Name your canvas, get a shareable link instantly.' },
                        { n: '02', title: 'Invite your team', desc: 'Share the link. Your people join in one click.' },
                        { n: '03', title: 'Sketch together', desc: 'Draw, talk, iterate — the canvas updates for everyone in real time.' },
                    ].map((step, i) => (
                        <div key={step.n} className="landing-how-step animate-spring" style={{ animationDelay: `${i * 0.15}s` }}>
                            <div className="landing-step-num">{step.n}</div>
                            <h3 className="landing-step-title">{step.title}</h3>
                            <p className="landing-step-desc">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA Banner ── */}
            <section className="landing-cta-section">
                <div className="landing-cta-card">
                    <StarDoodle style={{ top: -20, left: 20 }} delay="0s" />
                    <StarDoodle style={{ bottom: -10, right: 30 }} delay="0.3s" />
                    {/* 3D floating rings inside CTA */}
                    <div className="ring-deco" style={{ width: 200, height: 200, top: '50%', left: '-5%', color: 'rgba(255,255,255,0.12)', animationDuration: '12s' }} />
                    <div className="ring-deco" style={{ width: 140, height: 140, top: '20%', right: '-3%', color: 'rgba(255,255,255,0.1)', animationDelay: '2s', animationDuration: '10s' }} />
                    <h2 className="landing-cta-heading">Ready to sketch together?</h2>
                    <p className="landing-cta-subtext">Free forever. No credit card required.</p>
                    {token ? (
                        <button className="landing-cta-btn" style={{ marginTop: '1.5rem', background: 'white', color: 'var(--primary)' }} onClick={() => navigate('/dashboard')}>
                            Open My Sketchbook ✏️
                        </button>
                    ) : (
                        <Link to="/register" className="landing-cta-btn" style={{ marginTop: '1.5rem', display: 'inline-block', background: 'white', color: 'var(--primary)' }}>
                            Create Your Free Canvas 🎨
                        </Link>
                    )}
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="landing-footer">
                <span className="landing-footer-logo">Ketch ✏️</span>
                <span className="landing-footer-copy">© 2026 Ketch. Made with ❤️ and too many doodles.</span>
            </footer>
        </div>
    );
};

export default LandingPage;
