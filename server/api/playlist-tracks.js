const { getApiClients } = require('../auth-manager');
const {
  getSpotifyPlaylistTracks,
  getDeezerPlaylistTracks,
  getYouTubePlaylistTracks
} = require('../api-helpers');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { service, playlistId } = req.query;
  
  if (!service || !playlistId) {
    return res.status(400).json({ message: 'Service and playlistId parameters required' });
  }

  try {
    const apiClients = await getApiClients();
    let tracks;

    switch (service) {
      case 'spotify':
        tracks = await getSpotifyPlaylistTracks(apiClients.spotify, playlistId);
        break;
      case 'deezer':
        tracks = await getDeezerPlaylistTracks(apiClients.deezerToken, playlistId);
        break;
      case 'google':
        tracks = await getYouTubePlaylistTracks(apiClients.youtube, playlistId);
        break;
      default:
        return res.status(400).json({ message: 'Invalid service' });
    }

    res.json(tracks);
  } catch (error) {
    console.error(`Error fetching tracks for ${service} playlist ${playlistId}:`, error.message);
    res.status(500).json({ message: `Failed to fetch tracks: ${error.message}` });
  }
}; 