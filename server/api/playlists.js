const axios = require('axios');
const { getApiClients } = require('../auth-manager');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { service } = req.query;
  
  if (!service) {
    return res.status(400).json({ message: 'Service parameter required' });
  }

  try {
    const apiClients = await getApiClients();
    let playlists;

    switch (service) {
      case 'spotify':
        if (!apiClients.spotify.getAccessToken()) {
          return res.status(401).json({ message: 'Spotify not authenticated' });
        }
        const userData = await apiClients.spotify.getMe();
        const playlistData = await apiClients.spotify.getUserPlaylists(userData.body.id);
        playlists = playlistData.body.items;
        break;

      case 'deezer':
        if (!apiClients.deezerToken) {
          return res.status(401).json({ message: 'Deezer not authenticated' });
        }
        const deezerResponse = await axios.get(`https://api.deezer.com/user/me/playlists?access_token=${apiClients.deezerToken}`);
        playlists = deezerResponse.data.data;
        break;

      case 'google':
        if (!apiClients.youtube) {
          return res.status(401).json({ message: 'Google not authenticated' });
        }
        const youtubeResponse = await apiClients.youtube.playlists.list({
          part: 'snippet,contentDetails',
          mine: true,
          maxResults: 50,
        });
        playlists = youtubeResponse.data.items;
        break;

      default:
        return res.status(400).json({ message: 'Invalid service' });
    }

    res.json(playlists);
  } catch (error) {
    console.error(`Error fetching ${service} playlists:`, error.message);
    res.status(500).json({ message: `Failed to fetch ${service} playlists` });
  }
}; 