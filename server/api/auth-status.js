const { getTokens } = require('../auth-manager');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const tokens = await getTokens();
    const status = {
      spotify: !!(tokens.spotify && tokens.spotify.access_token),
      deezer: !!(tokens.deezer && tokens.deezer.access_token),
      google: !!(tokens.google && tokens.google.access_token),
    };
    res.json(status);
  } catch (error) {
    console.error('Error fetching auth status:', error);
    res.status(500).json({ message: 'Failed to fetch auth status' });
  }
}; 