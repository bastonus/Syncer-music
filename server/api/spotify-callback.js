const { getApiClients, saveTokens } = require('../auth-manager');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const error = req.query.error;
  const code = req.query.code;

  if (error) {
    console.error('Callback Error:', error);
    return res.status(400).json({ message: `Callback Error: ${error}` });
  }

  try {
    const { spotify } = await getApiClients();
    const data = await spotify.authorizationCodeGrant(code);
    
    const tokens = {
      access_token: data.body['access_token'],
      refresh_token: data.body['refresh_token'],
      expires_at: Date.now() + data.body['expires_in'] * 1000,
    };

    spotify.setAccessToken(tokens.access_token);
    spotify.setRefreshToken(tokens.refresh_token);
    await saveTokens('spotify', tokens);

    console.log('Successfully retrieved access token');
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(frontendUrl);
  } catch (error) {
    console.error('Error getting Tokens:', error);
    res.status(500).json({ message: `Error getting Tokens: ${error}` });
  }
}; 