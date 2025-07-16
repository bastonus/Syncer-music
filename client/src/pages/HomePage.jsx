import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ServicePanel from '../components/ServicePanel';
import spotifyLogo from '../assets/logos/spotify-logo.png';
import deezerLogo from '../assets/logos/deezer-logo.png';
import youtubeMusicLogo from '../assets/logos/youtube-music-logo.png';

const HomePage = () => {
  const [authStatus, setAuthStatus] = useState({ spotify: false, deezer: false, google: false });
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  // Services configuration
  const services = [
    {
      id: 'spotify',
      name: 'Spotify',
      icon: spotifyLogo,
      count: 0
    },
    {
      id: 'deezer', 
      name: 'Deezer',
      icon: deezerLogo,
      count: 0
    },
    {
      id: 'google',
      name: 'YouTube Music', 
      icon: youtubeMusicLogo,
      count: 0
    }
  ];

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
      const response = await fetch('/api/auth-status'); // Updated endpoint for serverless
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

  const handleServiceConnect = (service) => {
    const urls = {
      spotify: 'http://localhost:3001/auth/spotify',
      deezer: 'http://localhost:3001/auth/deezer',
      google: 'http://localhost:3001/auth/google'
    };
    window.location.href = urls[service];
  };
  
  // Placeholder for the main app structure
  return (
    <div className="app-layout">
      <Sidebar 
        services={services}
        authStatus={authStatus} 
        handleServiceConnect={handleServiceConnect}
        theme={theme}
        setTheme={setTheme}
        hasSelectedTracks={false}
        connectedServices={services.filter(s => authStatus[s.id])}
        transferSource={null}
        transferLoading={false}
        fetchPlaylists={() => {}}
        handleTransfer={() => {}}
        handleDragOver={() => {}}
        handleDrop={() => {}}
        handleDragLeave={() => {}}
        dropTarget={null}
      />
      <main className="main-content-new">
        <ServicePanel panelId="left" authStatus={authStatus} />
        <ServicePanel panelId="right" authStatus={authStatus} />
      </main>
    </div>
  );
};



export default HomePage; 