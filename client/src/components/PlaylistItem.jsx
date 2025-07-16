import React, { useState } from 'react';
import TrackList from './TrackList';

const PlaylistItem = ({ 
  playlist, 
  serviceId, 
  authStatus, 
  selectedTracks, 
  onTrackSelect, 
  onDragStart, 
  getPlaylistImage, 
  getPlaylistName, 
  getPlaylistMeta 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleExpansion = async () => {
    const shouldExpand = !isExpanded;
    setIsExpanded(shouldExpand);

    if (shouldExpand && tracks.length === 0) {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/playlist-tracks?service=${serviceId}&playlistId=${playlist.id}`);
        if (!response.ok) throw new Error('Failed to fetch tracks');
        const fetchedTracks = await response.json();
        setTracks(fetchedTracks);
      } catch (error) {
        console.error('Error fetching tracks:', error);
        setIsExpanded(false); // Rollback expansion on error
      } finally {
        setIsLoading(false);
      }
    }
  };

  const playlistId = playlist.id;

  return (
    <div className="playlist-item-new">
      <div 
        className="playlist-item-header"
        draggable={authStatus}
        onDragStart={(e) => onDragStart(e, playlist, serviceId)}
        onDragEnd={() => onDragStart(e, null, null)} // Clear dragged item
        onClick={toggleExpansion}
      >
        <img
          src={getPlaylistImage(playlist, serviceId)}
          alt={getPlaylistName(playlist, serviceId)}
          className="playlist-image-new"
        />
        <div className="playlist-details">
          <div className="playlist-name-new">{getPlaylistName(playlist, serviceId)}</div>
          <div className="playlist-meta">{getPlaylistMeta(playlist, serviceId)}</div>
        </div>
        <span className={`expansion-arrow ${isExpanded ? 'expanded' : ''}`}>›</span>
      </div>
      {isExpanded && (
        isLoading 
        ? <div className="loading">Chargement des pistes...</div>
        : <TrackList 
            tracks={tracks}
            playlistId={playlistId}
            serviceId={serviceId}
            selectedTracks={selectedTracks}
            onTrackSelect={onTrackSelect}
          />
      )}
    </div>
  );
};

export default PlaylistItem;
