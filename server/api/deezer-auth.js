module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const deezerAppId = process.env.DEEZER_APP_ID;
  const deezerRedirectUri = process.env.DEEZER_REDIRECT_URI || 'http://localhost:3001/api/deezer-callback';
  
  if (!deezerAppId) {
    return res.status(500).json({ message: 'Deezer app ID not configured' });
  }

  const url = `https://connect.deezer.com/oauth/auth.php?app_id=${deezerAppId}&redirect_uri=${deezerRedirectUri}&perms=basic_access,email,manage_library,delete_library,offline_access`;
  res.redirect(url);
}; 