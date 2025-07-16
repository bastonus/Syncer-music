import React from 'react';

const PlaylistSidebar = ({ playlists, selectedPlaylist, onPlaylistSelect, isLoading }) => {
  if (isLoading) {
    return <div className="playlist-sidebar loading">Chargement des playlists...</div>;
  }

  if (playlists.length === 0) {
    return <div className="playlist-sidebar empty">Aucune playlist trouvée.</div>;
  }

  return (
    <div className="playlist-sidebar">
      <ul className="playlist-list">
        {playlists.map((playlist) => (
          <li
            key={playlist.id}
            className={`playlist-entry ${selectedPlaylist?.id === playlist.id ? 'selected' : ''}`}
            onClick={() => onPlaylistSelect(playlist)}
          >
            {playlist.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlaylistSidebar; 