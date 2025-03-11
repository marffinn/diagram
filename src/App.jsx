// src/App.jsx
import { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import FlowCanvas from './components/FlowCanvas';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/user', { credentials: 'include' });
        const data = await res.json();
        console.log('User fetch response:', data); // Debug log
        if (data.id) {
          setUser(data);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <SplashScreen />;
  }

  return <FlowCanvas user={user} />;
}