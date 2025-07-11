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

  const handleTransfer = () => {
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

    fetch('/api/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        source, 
        destination, 
        playlistId: selectedPlaylist,
        playlistName: playlist.name || playlist.title || playlist.snippet.title
      }),
    })
    .then(res => {
      if (!res.ok) {
        throw new Error('Transfer failed');
      }
      return res.json();
    })
    .then(data => {
      console.log(data);
      setStatus('success');
    })
    .catch(error => {
      console.error('Transfer error:', error);
      setStatus('error');
    });
  };

  return (
    <div>
      <h2>Transfer Playlists</h2>
      <div>
        <label>From: </label>
        <select value={source} onChange={e => setSource(e.target.value)}>
          <option value="">Select Source</option>
          <option value="spotify">Spotify</option>
          <option value="deezer">Deezer</option>
          <option value="youtube">YouTube Music</option>
        </select>
      </div>
      <div>
        <label>To: </label>
        <select value={destination} onChange={e => setDestination(e.target.value)}>
          <option value="">Select Destination</option>
          <option value="spotify">Spotify</option>
          <option value="deezer">Deezer</option>
          <option value="youtube">YouTube Music</option>
        </select>
      </div>
      {source && (
        <div>
          <label>Select Playlist: </label>
          <select value={selectedPlaylist} onChange={e => setSelectedPlaylist(e.target.value)}>
            <option value="">Select a playlist</option>
            {sourcePlaylists.map(p => (
              <option key={p.id} value={p.id}>{p.name || p.title || p.snippet.title}</option>
            ))}
          </select>
        </div>
      )}
      <button onClick={handleTransfer} disabled={status === 'transferring'}>
        {status === 'transferring' ? 'Transferring...' : 'Transfer'}
      </button>
      {status === 'success' && <p>Transfer successful!</p>}
      {status === 'error' && <p>Transfer failed. Please try again.</p>}
    </div>
  );
};

export default Transfer; 