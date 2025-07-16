import React from 'react';
import PlaylistItem from './PlaylistItem';

const PlaylistColumn = ({
  service,
  authStatus,
  loading,
  filteredPlaylists,
  handleServiceConnect,
  ...playlistItemProps // Pass down all other props to PlaylistItem
}) => {
  return (
    <div className="service-column">
      <div className="service-column-header">
        <div className="service-column-title">
          <img src={service.icon} alt={service.name} className="service-icon" />
          <span style={{ marginLeft: '0.75rem' }}>{service.name}</span>
        </div>
        {service.count > 0 && (
          <div className="playlist-count">{filteredPlaylists.length} / {service.count}</div>
        )}
      </div>

      <div className="playlist-list-container">
        {!authStatus ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔗</div>
            <div className="empty-state-title">Service non connecté</div>
            <div className="empty-state-description">
              Connectez-vous à {service.name} pour voir vos playlists.
            </div>
            <button 
              className="btn-primary" 
              style={{ marginTop: '1rem' }}
              onClick={() => handleServiceConnect(service.id)}
            >
              Se connecter
            </button>
          </div>
        ) : loading ? (
          <div className="loading">Chargement...</div>
        ) : filteredPlaylists.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧐</div>
            <div className="empty-state-title">Aucune playlist trouvée</div>
            <div className="empty-state-description">
              Aucune playlist ne correspond à vos critères.
            </div>
          </div>
        ) : (
          filteredPlaylists.map(playlist => (
            <PlaylistItem 
              key={playlist.id}
              playlist={playlist}
              serviceId={service.id}
              authStatus={authStatus}
              {...playlistItemProps}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default PlaylistColumn;
