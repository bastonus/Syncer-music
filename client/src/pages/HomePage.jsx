import { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import Transfer from '../Transfer';
import Sync from '../Sync';
import Share from '../Share'; // Assuming Share component is created

const HomePage = () => {
  // All the state and functions from App.jsx will go here
  const [playlists, setPlaylists] = useState([]);
  const [deezerPlaylists, setDeezerPlaylists] = useState([]);
  const [youtubePlaylists, setYoutubePlaylists] = useState([]);

  const handleLogin = () => window.location.href = 'http://localhost:3001/auth/spotify';
  const handleDeezerLogin = () => window.location.href = 'http://localhost:3001/auth/deezer';
  const handleGoogleLogin = () => window.location.href = 'http://localhost:3001/auth/google';

  const fetchPlaylists = async (service) => {
    try {
      const response = await fetch(`http://localhost:3001/api/${service}/playlists`);
      if (!response.ok) throw new Error(`Failed to fetch ${service} playlists`);
      const data = await response.json();
      if (service === 'spotify') setPlaylists(data);
      else if (service === 'deezer') setDeezerPlaylists(data);
      else if (service === 'google') setYoutubePlaylists(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <nav style={{ marginBottom: '20px' }}>
        <Link to="/settings">Go to Settings</Link>
      </nav>
      <h1>Syncer Music</h1>
      <p>Transfer, Sync, and Share your playlists between Spotify, Deezer, and YouTube Music.</p>
      <button onClick={handleLogin}>Login with Spotify</button>
      <button onClick={handleDeezerLogin}>Login with Deezer</button>
      <button onClick={handleGoogleLogin}>Login with YouTube Music</button>

      <hr />
      <button onClick={() => fetchPlaylists('spotify')}>Fetch Spotify Playlists</button>
      <button onClick={() => fetchPlaylists('deezer')}>Fetch Deezer Playlists</button>
      <button onClick={() => fetchPlaylists('google')}>Fetch YouTube Playlists</button>

      <hr />
      <Transfer 
        spotifyPlaylists={playlists} 
        deezerPlaylists={deezerPlaylists} 
        youtubePlaylists={youtubePlaylists} 
      />
      <hr />
      <Sync
        spotifyPlaylists={playlists}
        deezerPlaylists={deezerPlaylists}
        youtubePlaylists={youtubePlaylists}
      />
      <hr />
      <Share
        spotifyPlaylists={playlists}
        deezerPlaylists={deezerPlaylists}
        youtubePlaylists={youtubePlaylists}
      />
      {/* The list displays can be removed or kept as is */}
    </div>
  );
};

export default HomePage; 