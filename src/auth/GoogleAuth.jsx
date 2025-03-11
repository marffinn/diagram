// src/auth/GoogleAuth.jsx
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';

const firebaseConfig = {
    // Add your Firebase config here
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export default function GoogleAuth({ onLogin }) {
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, provider);
            onLogin(result.user);
        } catch (error) {
            console.error('Login failed:', error);
        }
        setLoading(false);
    };

    return (
        <button
            onClick={handleLogin}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded"
        >
            {loading ? 'Logging in...' : 'Login with Google'}
        </button>
    );
}