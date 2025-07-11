const fs = require('fs/promises');
const path = require('path');

const TOKENS_PATH = path.join(__dirname, 'auth-tokens.json');

// A simple in-memory lock to prevent race conditions
let isWriting = false;

async function saveTokens(service, tokens) {
  while (isWriting) {
    await new Promise(resolve => setTimeout(resolve, 100)); // wait
  }

  isWriting = true;
  try {
    const allTokens = JSON.parse(await fs.readFile(TOKENS_PATH, 'utf-8'));
    allTokens[service] = tokens;
    await fs.writeFile(TOKENS_PATH, JSON.stringify(allTokens, null, 2));
  } catch (error) {
    console.error(`Auth Manager: Failed to save tokens for ${service}`, error);
  } finally {
    isWriting = false;
  }
}

async function getTokens() {
  try {
    return JSON.parse(await fs.readFile(TOKENS_PATH, 'utf-8'));
  } catch (error) {
    console.error('Auth Manager: Failed to read tokens file.', error);
    return {};
  }
}

async function refreshSpotifyToken(spotifyApi, currentTokens) {
  if (Date.now() < currentTokens.expires_at) {
    return currentTokens; // Not expired
  }

  console.log('Auth Manager: Spotify token expired, refreshing...');
  try {
    spotifyApi.setRefreshToken(currentTokens.refresh_token);
    const data = await spotifyApi.refreshAccessToken();
    const newTokens = {
      ...currentTokens,
      access_token: data.body['access_token'],
      expires_at: Date.now() + data.body['expires_in'] * 1000,
    };
    await saveTokens('spotify', newTokens);
    console.log('Auth Manager: Spotify token refreshed successfully.');
    return newTokens;
  } catch (error) {
    console.error('Auth Manager: Failed to refresh Spotify token.', error);
    throw error; // Propagate error
  }
}

// TODO: Refresh logic for Deezer and Google

// Google refresh is handled by the client library if tokens are set
async function getApiClients(spotifyApi, oauth2Client) {
  const allTokens = await getTokens();
  
  // Spotify
  if (allTokens.spotify && allTokens.spotify.refresh_token) {
    const freshSpotifyTokens = await refreshSpotifyToken(spotifyApi, allTokens.spotify);
    spotifyApi.setAccessToken(freshSpotifyTokens.access_token);
  }

  // Google
  if (allTokens.google && allTokens.google.refresh_token) {
    oauth2Client.setCredentials(allTokens.google);
  }

  // Deezer
  // Deezer's server-side refresh token flow is not as standard.
  // For this app, we'll rely on the existing token which is long-lived
  // with the 'offline_access' permission.
  const deezerToken = allTokens.deezer ? allTokens.deezer.access_token : null;

  return {
    spotifyApi,
    deezerToken,
    youtubeClient: oauth2Client,
  };
}

module.exports = {
  saveTokens,
  getApiClients,
}; 