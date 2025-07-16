const axios = require('axios');
const { saveTokens } = require('../auth-manager');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ message: 'No code provided' });
  }

  const deezerAppId = process.env.DEEZER_APP_ID;
  const deezerSecretKey = process.env.DEEZER_SECRET_KEY;

  try {
    const response = await axios.get(`https://connect.deezer.com/oauth/access_token.php?app_id=${deezerAppId}&secret=${deezerSecretKey}&code=${code}&output=json`);
    
    if (response.data.error) {
      throw new Error(response.data.error);
    }

    const tokens = {
      access_token: response.data.access_token,
      expires_at: Date.now() + response.data.expires * 1000,
    };

    await saveTokens('deezer', tokens);
    console.log('Deezer Access Token saved successfully');
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(frontendUrl);
  } catch (error) {
    console.error('Deezer auth error:', error.message);
    res.status(500).json({ message: 'Failed to authenticate with Deezer' });
  }
}; 