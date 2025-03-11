// src/components/SplashScreen.jsx
export default function SplashScreen() {
    return (
        <div
            style={{
                height: '100vh',
                width: '100vw',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', // Purple gradient
            }}
        >
            <div
                style={{
                    background: '#ffffff',
                    padding: '40px',
                    borderRadius: '15px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    width: '100%',
                    maxWidth: '400px',
                    textAlign: 'center',
                }}
            >
                <h1
                    style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: '#4f46e5', // Purple title
                        marginBottom: '20px',
                    }}
                >
                    PurpleCRM Login
                </h1>
                <p style={{ color: '#6b7280', marginBottom: '30px' }}>
                    Sign in to manage your clients efficiently
                </p>
                <a
                    href="http://localhost:3000/auth/google"
                    style={{
                        display: 'inline-block',
                        background: '#6366f1',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '25px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transition: 'background 0.2s',
                    }}
                    onMouseOver={(e) => (e.target.style.background = '#4f46e5')}
                    onMouseOut={(e) => (e.target.style.background = '#6366f1')}
                >
                    Login with Google
                </a>
            </div>
        </div>
    );
}