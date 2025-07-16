import React, { useState, useEffect } from 'react';
import PlaylistSidebar from './PlaylistSidebar';
import TrackList from './TrackList';
// Placeholder for service logos
import spotifyLogo from '../assets/logos/spotify-logo.png';
import deezerLogo from '../assets/logos/deezer-logo.png';
import youtubeMusicLogo from '../assets/logos/youtube-music-logo.png';

const serviceDetails = {
  spotify: { name: 'Spotify', logo: spotifyLogo },
  deezer: { name: 'Deezer', logo: deezerLogo },
  google: { name: 'YouTube Music', logo: youtubeMusicLogo },
};

const ServicePanel = ({ panelId, authStatus }) => {
  const [selectedService, setSelectedService] = useState('spotify');
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState({ playlists: false, tracks: false });

  // Placeholder for API functions - these will be passed down from HomePage
  const fetchPlaylists = async (service) => {
    console.log(`Fetching playlists for ${service} in panel ${panelId}`);
    // Mock data for now
    setPlaylists([
        { id: '1', name: 'Playlist A' },
        { id: '2', name: 'Playlist B' },
    ]);
  };

  const fetchTracks = async (playlistId) => {
    console.log(`Fetching tracks for playlist ${playlistId} in panel ${panelId}`);
    // Mock data for now
    setTracks([
        { id: 't1', title: 'Track 1', artist: 'Artist A' },
        { id: 't2', title: 'Track 2', artist: 'Artist B' },
    ]);
  };

  useEffect(() => {
    if (authStatus[selectedService]) {
      fetchPlaylists(selectedService);
    } else {
      setPlaylists([]);
      setTracks([]);
      setSelectedPlaylist(null);
    }
  }, [selectedService, authStatus]);

  const handleServiceChange = (e) => {
    setSelectedService(e.target.value);
  };

  const handlePlaylistSelect = (playlist) => {
    setSelectedPlaylist(playlist);
    fetchTracks(playlist.id);
  };

  return (
    <div className="service-panel">
      <div className="panel-header">
        <select onChange={handleServiceChange} value={selectedService} className="service-selector">
          {Object.keys(serviceDetails).map((service) => (
            <option key={service} value={service}>
              {serviceDetails[service].name}
            </option>
          ))}
        </select>
        {!authStatus[selectedService] && (
            <button className="connect-btn">Connect</button>
        )}
      </div>
      <div className="panel-body">
        <PlaylistSidebar
          playlists={playlists}
          selectedPlaylist={selectedPlaylist}
          onPlaylistSelect={handlePlaylistSelect}
          isLoading={loading.playlists}
        />
        <TrackList
          tracks={tracks}
          isLoading={loading.tracks}
          playlistName={selectedPlaylist?.name}
        />
      </div>
    </div>
  );
};

export default ServicePanel; 