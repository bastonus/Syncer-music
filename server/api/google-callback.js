const { getApiClients, saveTokens } = require('../auth-manager');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ message: 'No code provided' });
  }

  try {
    const { google } = await getApiClients();
    const { tokens } = await google.getToken(code);
    google.setCredentials(tokens);
    await saveTokens('google', tokens);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(frontendUrl);
  } catch (error) {
    console.error('Google auth error:', error.message);
    res.status(500).json({ message: 'Failed to authenticate with Google' });
  }
}; 