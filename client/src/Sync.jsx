import React, { useState, useEffect } from 'react';

const Sync = ({ spotifyPlaylists, deezerPlaylists, youtubePlaylists }) => {
  const [sourceService, setSourceService] = useState('');
  const [sourcePlaylistId, setSourcePlaylistId] = useState('');
  const [destService, setDestService] = useState('');
  const [destPlaylistName, setDestPlaylistName] = useState('');
  const [syncJobs, setSyncJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const getPlaylistsByService = (service) => {
    switch(service) {
      case 'spotify': return spotifyPlaylists;
      case 'deezer': return deezerPlaylists;
      case 'youtube': return youtubePlaylists;
      default: return [];
    }
  };

  const fetchSyncJobs = async () => {
    try {
      const response = await fetch('/api/sync/jobs');
      const data = await response.json();
      setSyncJobs(data);
    } catch (error) {
      console.error('Failed to fetch sync jobs:', error);
    }
  };

  useEffect(() => {
    fetchSyncJobs();
  }, []);

  const handleCreateSync = async () => {
    if (!sourceService || !sourcePlaylistId || !destService) {
      alert('Please fill all fields.');
      return;
    }
    const sourcePlaylist = getPlaylistsByService(sourceService).find(p => p.id === sourcePlaylistId);
    const newDestPlaylistName = destPlaylistName || `${sourcePlaylist.name || sourcePlaylist.title || sourcePlaylist.snippet.title} (Synced)`;

    setIsLoading(true);
    try {
      const response = await fetch('/api/sync/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceService,
          sourcePlaylistId,
          destService,
          destPlaylistName: newDestPlaylistName,
        }),
      });
      if (!response.ok) throw new Error('Failed to create sync job');
      
      // Reset form and refresh list
      setSourceService('');
      setSourcePlaylistId('');
      setDestService('');
      setDestPlaylistName('');
      fetchSyncJobs();

    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <p>Keep playlists synchronized in real-time across platforms</p>
      
      <div className="form-group">
        <label className="form-label">Source Service:</label>
        <select 
          value={sourceService} 
          onChange={e => setSourceService(e.target.value)}
          className="form-select"
          disabled={isLoading}
        >
          <option value="">Select...</option>
          <option value="spotify">🎵 Spotify</option>
          <option value="deezer">🎶 Deezer</option>
          <option value="youtube">▶️ YouTube Music</option>
        </select>
      </div>

      {sourceService && (
        <div className="form-group">
          <label className="form-label">Source Playlist:</label>
          <select 
            value={sourcePlaylistId} 
            onChange={e => setSourcePlaylistId(e.target.value)}
            className="form-select"
            disabled={isLoading}
          >
            <option value="">Select...</option>
            {getPlaylistsByService(sourceService).map(p => (
              <option key={p.id} value={p.id}>
                {p.name || p.title || p.snippet.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Destination Service:</label>
        <select 
          value={destService} 
          onChange={e => setDestService(e.target.value)}
          className="form-select"
          disabled={isLoading}
        >
          <option value="">Select...</option>
          <option value="spotify">🎵 Spotify</option>
          <option value="deezer">🎶 Deezer</option>
          <option value="youtube">▶️ YouTube Music</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">New Playlist Name (optional):</label>
        <input 
          type="text" 
          value={destPlaylistName} 
          onChange={e => setDestPlaylistName(e.target.value)} 
          placeholder="Defaults to source name + (Synced)"
          className="form-input"
          disabled={isLoading}
        />
      </div>

      <button 
        onClick={handleCreateSync} 
        disabled={isLoading || !sourceService || !destService || !sourcePlaylistId}
        className="btn btn-primary"
      >
        {isLoading ? (
          <>
            <span className="loading"></span>
            Creating...
          </>
        ) : (
          '🔄 Create Sync'
        )}
      </button>

      <div style={{ marginTop: '2rem' }}>
        <h3>Active Syncs</h3>
        {syncJobs.length > 0 ? (
          <ul className="playlist-list">
            {syncJobs.map(job => (
              <li key={job.id} className="playlist-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{job.destPlaylistName}</strong>
                    <br />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {job.sourceService} → {job.destService}
                    </span>
                  </div>
                  <div style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px', 
                    background: job.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: job.status === 'active' ? '#22c55e' : '#ef4444',
                    fontSize: '0.8rem'
                  }}>
                    {job.status}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No active syncs.</p>
        )}
      </div>
    </div>
  );
};

export default Sync; 