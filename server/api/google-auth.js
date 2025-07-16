const { getApiClients, GOOGLE_REDIRECT_URI } = require('../auth-manager');

const googleAuthScopes = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl'
];

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { google } = await getApiClients();
    const url = google.generateAuthUrl({
      access_type: 'offline',
      scope: googleAuthScopes,
      prompt: 'consent',
      redirect_uri: GOOGLE_REDIRECT_URI
    });
    res.redirect(url);
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Failed to initiate Google auth' });
  }
}; 