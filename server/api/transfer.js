const { getApiClients } = require('../auth-manager');
const {
  searchSpotifyTrack,
  searchDeezerTrack,
  searchYouTubeTrack,
  createSpotifyPlaylist,
  createDeezerPlaylist,
  createYouTubePlaylist
} = require('../api-helpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { source, destination, tracks, playlistName } = req.body;

  if (!tracks || tracks.length === 0) {
    return res.status(400).json({ message: 'No tracks provided for transfer.' });
  }

  console.log(`Transfer request: ${tracks.length} tracks from ${source} to ${destination}`);

  try {
    const destinationTracks = [];
    const apiClients = await getApiClients();

    // Search for tracks on destination service
    for (const track of tracks) {
      let foundTrack;
      if (destination === 'spotify') {
        foundTrack = await searchSpotifyTrack(apiClients.spotify, track);
      } else if (destination === 'deezer') {
        foundTrack = await searchDeezerTrack(apiClients.deezerToken, track);
      } else if (destination === 'google') {
        foundTrack = await searchYouTubeTrack(apiClients.youtube, track);
      }
      if (foundTrack) {
        destinationTracks.push(foundTrack);
      }
    }

    // Create playlist on destination service
    let newPlaylist;
    if (destination === 'spotify') {
      const trackUris = destinationTracks.map(t => t.uri).filter(Boolean);
      newPlaylist = await createSpotifyPlaylist(apiClients.spotify, playlistName, trackUris);
    } else if (destination === 'deezer') {
      const trackIds = destinationTracks.map(t => t.id).filter(Boolean);
      newPlaylist = await createDeezerPlaylist(apiClients.deezerToken, playlistName, trackIds);
    } else if (destination === 'google') {
      const videoIds = destinationTracks.map(t => t.id.videoId).filter(Boolean);
      newPlaylist = await createYouTubePlaylist(apiClients.youtube, playlistName, videoIds);
    }

    if (newPlaylist) {
      res.json({ message: 'Transfer successful!', playlist: newPlaylist });
    } else {
      res.status(500).json({ message: 'Transfer failed.' });
    }
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ message: 'Transfer failed.' });
  }
}; 