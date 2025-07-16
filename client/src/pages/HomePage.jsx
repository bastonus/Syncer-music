import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ServicePanel from '../components/ServicePanel';

const HomePage = () => {
  const [authStatus, setAuthStatus] = useState({ spotify: false, deezer: false, google: false });
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  // We will manage panel-specific states here later
  
  useEffect(() => {
    fetchAuthStatus();
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const fetchAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status'); // This endpoint needs to be created or verified
      if (response.ok) {
        const data = await response.json();
        setAuthStatus(data);
      }
    } catch (error) {
      console.error('Error fetching auth status:', error);
    }
  };

  const handleThemeToggle = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };
  
  // Placeholder for the main app structure
  return (
    <div className="app-layout">
      <Sidebar 
        authStatus={authStatus} 
        onConnect={handleServiceConnect}
        theme={theme}
        onThemeToggle={handleThemeToggle}
      />
      <main className="main-content-new">
        <ServicePanel panelId="left" authStatus={authStatus} />
        <ServicePanel panelId="right" authStatus={authStatus} />
      </main>
    </div>
  );
};

// This function needs to be available or defined
const handleServiceConnect = (service) => {
    const urls = {
      spotify: 'http://localhost:3001/auth/spotify',
      deezer: 'http://localhost:3001/auth/deezer',
      google: 'http://localhost:3001/auth/google'
    };
    window.location.href = urls[service];
};

export default HomePage; 