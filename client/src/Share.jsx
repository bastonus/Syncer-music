import React, { useState } from 'react';

const Share = ({ spotifyPlaylists, deezerPlaylists, youtubePlaylists }) => {
  const [service, setService] = useState('');
  const [playlistId, setPlaylistId] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getPlaylistsByService = (service) => {
    switch(service) {
      case 'spotify': return spotifyPlaylists;
      case 'deezer': return deezerPlaylists;
      case 'youtube': return youtubePlaylists;
      default: return [];
    }
  };

  const handleGenerateLink = async () => {
    if (!service || !playlistId) {
      alert('Please select a service and a playlist.');
      return;
    }
    setIsLoading(true);
    setShareLink('');
    try {
      const response = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, playlistId }),
      });
      if (!response.ok) throw new Error('Failed to generate link');
      const data = await response.json();
      setShareLink(`${window.location.origin}/share/${data.shareId}`);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>Share a Playlist</h2>
      <p>Select a playlist to generate a unique shareable link.</p>
      
      <div>
        <label>Service: </label>
        <select value={service} onChange={e => setService(e.target.value)}>
          <option value="">Select...</option>
          <option value="spotify">Spotify</option>
          <option value="deezer">Deezer</option>
          <option value="youtube">YouTube Music</option>
        </select>
      </div>

      {service && (
        <div>
          <label>Playlist: </label>
          <select value={playlistId} onChange={e => setPlaylistId(e.target.value)}>
            <option value="">Select...</option>
            {getPlaylistsByService(service).map(p => (
              <option key={p.id} value={p.id}>{p.name || p.title || p.snippet.title}</option>
            ))}
          </select>
        </div>
      )}

      <button onClick={handleGenerateLink} disabled={isLoading || !playlistId}>
        {isLoading ? 'Generating...' : 'Generate Share Link'}
      </button>

      {shareLink && (
        <div>
          <p>Your share link is ready:</p>
          <input type="text" value={shareLink} readOnly />
          <button onClick={() => navigator.clipboard.writeText(shareLink)}>Copy</button>
        </div>
      )}
    </div>
  );
};

export default Share; 