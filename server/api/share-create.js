const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getApiClients } = require('../auth-manager');
const {
  getSpotifyPlaylistTracks,
  getDeezerPlaylistTracks,
  getYouTubePlaylistTracks,
  searchSpotifyTrack,
  searchDeezerTrack,
  searchYouTubeTrack
} = require('../api-helpers');

const SHARES_DIR = path.join(__dirname, '../shares');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { service, playlistId } = req.body;
  
  if (!service || !playlistId) {
    return res.status(400).json({ message: 'Service and playlistId required' });
  }

  try {
    const apiClients = await getApiClients();
    
    let sourceTracks = [];
    let playlistName = "A Shared Playlist";
    
    if (service === 'spotify') {
      sourceTracks = await getSpotifyPlaylistTracks(apiClients.spotify, playlistId);
    } else if (service === 'deezer') {
      sourceTracks = await getDeezerPlaylistTracks(apiClients.deezerToken, playlistId);
    } else if (service === 'youtube') {
      sourceTracks = await getYouTubePlaylistTracks(apiClients.youtube, playlistId);
    }

    const tracksWithLinks = await Promise.all(sourceTracks.map(async (track) => {
      const spotifyTrack = service === 'spotify' ? track : await searchSpotifyTrack(apiClients.spotify, track);
      const deezerTrack = service === 'deezer' ? track : await searchDeezerTrack(apiClients.deezerToken, track);
      const youtubeTrack = service === 'youtube' ? track : await searchYouTubeTrack(apiClients.youtube, track);

      return {
        name: track.name,
        artist: track.artist,
        links: {
          spotify: spotifyTrack ? (spotifyTrack.external_urls ? spotifyTrack.external_urls.spotify : null) : null,
          deezer: deezerTrack ? deezerTrack.link : null,
          youtube: youtubeTrack ? `https://www.youtube.com/watch?v=${youtubeTrack.id.videoId}` : null,
        }
      };
    }));

    const shareId = uuidv4();
    const shareData = {
      id: shareId,
      name: playlistName,
      sourceService: service,
      tracks: tracksWithLinks,
    };

    // Ensure shares directory exists
    await fs.mkdir(SHARES_DIR, { recursive: true });
    await fs.writeFile(path.join(SHARES_DIR, `${shareId}.json`), JSON.stringify(shareData, null, 2));
    
    res.status(201).json({ shareId });
  } catch (error) {
    console.error('Failed to create share:', error);
    res.status(500).json({ message: 'Failed to create share link.' });
  }
}; 