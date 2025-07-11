import React, { useState, useEffect } from 'react';

const Transfer = ({ spotifyPlaylists, deezerPlaylists, youtubePlaylists }) => {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState('');
  const [sourcePlaylists, setSourcePlaylists] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, transferring, success, error

  useEffect(() => {
    if (source === 'spotify') {
      setSourcePlaylists(spotifyPlaylists);
    } else if (source === 'deezer') {
      setSourcePlaylists(deezerPlaylists);
    } else if (source === 'youtube') {
      setSourcePlaylists(youtubePlaylists);
    } else {
      setSourcePlaylists([]);
    }
    setSelectedPlaylist('');
  }, [source, spotifyPlaylists, deezerPlaylists, youtubePlaylists]);

  const handleTransfer = async () => {
    if (!source || !destination || !selectedPlaylist) {
      alert('Please select source, destination, and a playlist.');
      return;
    }
    if (source === destination) {
      alert('Source and destination cannot be the same.');
      return;
    }
    
    const playlist = sourcePlaylists.find(p => p.id === selectedPlaylist);
    if (!playlist) {
      alert('Playlist not found');
      return;
    }

    setStatus('transferring');

    try {
      const response = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          source, 
          destination, 
          playlistId: selectedPlaylist,
          playlistName: playlist.name || playlist.title || playlist.snippet.title
        }),
      });
      
      if (!response.ok) {
        throw new Error('Transfer failed');
      }
      
      const data = await response.json();
      console.log(data);
      setStatus('success');
    } catch (error) {
      console.error('Transfer error:', error);
      setStatus('error');
    }
  };

  return (
    <div>
      <p>Move a playlist from one service to another</p>
      
      <div className="form-group">
        <label className="form-label">From:</label>
        <select 
          value={source} 
          onChange={e => setSource(e.target.value)}
          className="form-select"
          disabled={status === 'transferring'}
        >
          <option value="">Select Source</option>
          <option value="spotify">🎵 Spotify</option>
          <option value="deezer">🎶 Deezer</option>
          <option value="youtube">▶️ YouTube Music</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">To:</label>
        <select 
          value={destination} 
          onChange={e => setDestination(e.target.value)}
          className="form-select"
          disabled={status === 'transferring'}
        >
          <option value="">Select Destination</option>
          <option value="spotify">🎵 Spotify</option>
          <option value="deezer">🎶 Deezer</option>
          <option value="youtube">▶️ YouTube Music</option>
        </select>
      </div>

      {source && (
        <div className="form-group">
          <label className="form-label">Select Playlist:</label>
          <select 
            value={selectedPlaylist} 
            onChange={e => setSelectedPlaylist(e.target.value)}
            className="form-select"
            disabled={status === 'transferring'}
          >
            <option value="">Select a playlist</option>
            {sourcePlaylists.map(p => (
              <option key={p.id} value={p.id}>
                {p.name || p.title || p.snippet.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <button 
        onClick={handleTransfer} 
        disabled={status === 'transferring' || !selectedPlaylist}
        className="btn btn-primary"
      >
        {status === 'transferring' ? (
          <>
            <span className="loading"></span>
            Transferring...
          </>
        ) : (
          '🚀 Start Transfer'
        )}
      </button>

      {status === 'success' && (
        <div className="status-success">
          ✅ Transfer completed successfully!
        </div>
      )}
      
      {status === 'error' && (
        <div className="status-error">
          ❌ Transfer failed. Please try again.
        </div>
      )}
    </div>
  );
};

export default Transfer; 