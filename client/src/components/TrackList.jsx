import React from 'react';

const TrackList = ({ tracks, isLoading, playlistName }) => {
  return (
    <div className="track-list-container">
      <div className="track-list-header">
        <h3>{playlistName || 'Pistes'}</h3>
      </div>
      <div className="track-list-body">
        {isLoading && <div className="loading-state">Chargement des pistes...</div>}
        {!isLoading && tracks.length === 0 && (
          <div className="empty-state">
            <p>Sélectionnez une playlist pour voir les pistes.</p>
          </div>
        )}
        {!isLoading && tracks.length > 0 && (
          <ul className="track-list">
            {tracks.map((track, index) => (
              <li key={track.id || index} className="track-entry">
                <span className="track-number">{index + 1}</span>
                <div className="track-details">
                  <span className="track-title">{track.title}</span>
                  <span className="track-artist">{track.artist}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TrackList;
