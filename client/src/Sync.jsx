import React, { useState, useEffect } from 'react';

const Sync = ({ spotifyPlaylists, deezerPlaylists, youtubePlaylists }) => {
  const [sourceService, setSourceService] = useState('');
  const [sourcePlaylistId, setSourcePlaylistId] = useState('');
  const [destService, setDestService] = useState('');
  const [destPlaylistName, setDestPlaylistName] = useState('');
  const [syncJobs, setSyncJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Combine playlists for easier selection
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
      <h2>Real-time Sync</h2>
      <p>Select a source playlist and a destination service. A new playlist will be created in the destination and kept in sync.</p>
      
      <div>
        <label>Source Service: </label>
        <select value={sourceService} onChange={e => setSourceService(e.target.value)} disabled={isLoading}>
          <option value="">Select...</option>
          <option value="spotify">Spotify</option>
          <option value="deezer">Deezer</option>
          <option value="youtube">YouTube Music</option>
        </select>
      </div>

      {sourceService && (
        <div>
          <label>Source Playlist: </label>
          <select value={sourcePlaylistId} onChange={e => setSourcePlaylistId(e.target.value)} disabled={isLoading}>
            <option value="">Select...</option>
            {getPlaylistsByService(sourceService).map(p => (
              <option key={p.id} value={p.id}>{p.name || p.title || p.snippet.title}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label>Destination Service: </label>
        <select value={destService} onChange={e => setDestService(e.target.value)} disabled={isLoading}>
          <option value="">Select...</option>
          <option value="spotify">Spotify</option>
          <option value="deezer">Deezer</option>
          <option value="youtube">YouTube Music</option>
        </select>
      </div>

      <div>
        <label>New Playlist Name (optional): </label>
        <input 
          type="text" 
          value={destPlaylistName} 
          onChange={e => setDestPlaylistName(e.target.value)} 
          placeholder="Defaults to source name + (Synced)"
          disabled={isLoading}
        />
      </div>

      <button onClick={handleCreateSync} disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Sync'}
      </button>

      <hr />
      <h3>Active Syncs</h3>
      {syncJobs.length > 0 ? (
        <ul>
          {syncJobs.map(job => (
            <li key={job.id}>
              Syncing from <strong>{job.sourceService}</strong> to <strong>{job.destService}</strong> (Playlist: {job.destPlaylistName}) - Status: {job.status}
            </li>
          ))}
        </ul>
      ) : (
        <p>No active syncs.</p>
      )}
    </div>
  );
};

export default Sync; 