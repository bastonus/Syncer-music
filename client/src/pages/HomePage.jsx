import { useState } from 'react';
import { Link } from 'react-router-dom';
import Transfer from '../Transfer';
import Sync from '../Sync';
import Share from '../Share';

const HomePage = () => {
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
    <div className="fade-in">
      {/* Navigation */}
      <nav className="nav">
        <div className="container">
          <Link to="/settings" className="nav-link">⚙️ Settings</Link>
        </div>
      </nav>

      <div className="container">
        {/* Hero Section */}
        <div className="hero">
          <h1>Syncer Music</h1>
          <p>
            Transfer, sync, and share your playlists seamlessly between Spotify, Deezer, and YouTube Music. 
            Keep your music library synchronized across all platforms.
          </p>
        </div>

        {/* Authentication Section */}
        <div className="card">
          <h2>🔐 Connect Your Accounts</h2>
          <p>Connect to your music streaming services to get started</p>
          <div className="service-buttons">
            <button onClick={handleLogin} className="btn-service btn-spotify">
              🎵 Connect Spotify
            </button>
            <button onClick={handleDeezerLogin} className="btn-service btn-deezer">
              🎶 Connect Deezer
            </button>
            <button onClick={handleGoogleLogin} className="btn-service btn-youtube">
              ▶️ Connect YouTube Music
            </button>
          </div>
        </div>

        {/* Fetch Playlists Section */}
        <div className="card">
          <h2>📚 Load Your Playlists</h2>
          <p>Fetch your playlists from connected services</p>
          <div className="service-buttons">
            <button onClick={() => fetchPlaylists('spotify')} className="btn-service btn-spotify">
              📥 Fetch Spotify Playlists
            </button>
            <button onClick={() => fetchPlaylists('deezer')} className="btn-service btn-deezer">
              📥 Fetch Deezer Playlists
            </button>
            <button onClick={() => fetchPlaylists('google')} className="btn-service btn-youtube">
              📥 Fetch YouTube Playlists
            </button>
          </div>
        </div>

        {/* Main Features Grid */}
        <div className="grid grid-3">
          {/* Transfer */}
          <div className="card">
            <h2>🔄 Transfer</h2>
            <Transfer 
              spotifyPlaylists={playlists} 
              deezerPlaylists={deezerPlaylists} 
              youtubePlaylists={youtubePlaylists} 
            />
          </div>

          {/* Sync */}
          <div className="card">
            <h2>🔄 Real-time Sync</h2>
            <Sync
              spotifyPlaylists={playlists}
              deezerPlaylists={deezerPlaylists}
              youtubePlaylists={youtubePlaylists}
            />
          </div>

          {/* Share */}
          <div className="card">
            <h2>🔗 Share</h2>
            <Share
              spotifyPlaylists={playlists}
              deezerPlaylists={deezerPlaylists}
              youtubePlaylists={youtubePlaylists}
            />
          </div>
        </div>

        {/* Playlist Overview */}
        {(playlists.length > 0 || deezerPlaylists.length > 0 || youtubePlaylists.length > 0) && (
          <div className="grid grid-3">
            {playlists.length > 0 && (
              <div className="card">
                <h2>🎵 Spotify Playlists ({playlists.length})</h2>
                <ul className="playlist-list">
                  {playlists.slice(0, 5).map(playlist => (
                    <li key={playlist.id} className="playlist-item">{playlist.name}</li>
                  ))}
                  {playlists.length > 5 && <li className="playlist-item">...and {playlists.length - 5} more</li>}
                </ul>
              </div>
            )}

            {deezerPlaylists.length > 0 && (
              <div className="card">
                <h2>🎶 Deezer Playlists ({deezerPlaylists.length})</h2>
                <ul className="playlist-list">
                  {deezerPlaylists.slice(0, 5).map(playlist => (
                    <li key={playlist.id} className="playlist-item">{playlist.title}</li>
                  ))}
                  {deezerPlaylists.length > 5 && <li className="playlist-item">...and {deezerPlaylists.length - 5} more</li>}
                </ul>
              </div>
            )}

            {youtubePlaylists.length > 0 && (
              <div className="card">
                <h2>▶️ YouTube Playlists ({youtubePlaylists.length})</h2>
                <ul className="playlist-list">
                  {youtubePlaylists.slice(0, 5).map(playlist => (
                    <li key={playlist.id} className="playlist-item">{playlist.snippet.title}</li>
                  ))}
                  {youtubePlaylists.length > 5 && <li className="playlist-item">...and {youtubePlaylists.length - 5} more</li>}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage; 