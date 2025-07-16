const fs = require('fs/promises');
const path = require('path');
const { google } = require('googleapis');
const SpotifyWebApi = require('spotify-web-api-node');

const TOKENS_PATH = path.join(__dirname, 'auth-tokens.json');
const GOOGLE_REDIRECT_URI = 'http://localhost:3001/auth/google/callback';

// A simple in-memory lock to prevent race conditions
let isWriting = false;

async function saveTokens(service, tokens) {
  while (isWriting) {
    await new Promise(resolve => setTimeout(resolve, 100)); // wait
  }

  isWriting = true;
  try {
    let allTokens = {};
    try {
      const fileContent = await fs.readFile(TOKENS_PATH, 'utf-8');
      allTokens = JSON.parse(fileContent);
    } catch (error) {
      if (error.code !== 'ENOENT') { // ENOENT means file not found
        throw error;
      }
      // If file doesn't exist, we start with an empty object.
      console.log('Auth Manager: auth-tokens.json not found, creating a new one.');
    }
    
    allTokens[service] = tokens;
    await fs.writeFile(TOKENS_PATH, JSON.stringify(allTokens, null, 2));
    console.log(`Auth Manager: Tokens for ${service} saved successfully.`);
  } catch (error) {
    console.error(`Auth Manager: Failed to save tokens for ${service}`, error);
  } finally {
    isWriting = false;
  }
}

async function getTokens(service) {
  try {
    const allTokens = JSON.parse(await fs.readFile(TOKENS_PATH, 'utf-8'));
    return service ? allTokens[service] : allTokens;
  } catch (error) {
    if (error.code === 'ENOENT') return service ? null : {};
    console.error('Auth Manager: Failed to read tokens file.', error);
    return service ? null : {};
  }
}

async function refreshSpotifyToken(spotifyApi) {
  const currentTokens = await getTokens('spotify');
  if (!currentTokens) return null;

  if (Date.now() < currentTokens.expires_at) {
    spotifyApi.setAccessToken(currentTokens.access_token);
    return spotifyApi;
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
    spotifyApi.setAccessToken(newTokens.access_token);
    console.log('Auth Manager: Spotify token refreshed successfully.');
    return spotifyApi;
  } catch (error) {
    console.error('Auth Manager: Failed to refresh Spotify token.', error);
    throw error;
  }
}

// Google refresh is handled by the client library
async function getApiClients() {
  const allTokens = await getTokens();
  
  // Spotify Client
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
  });
  if (allTokens.spotify) {
    await refreshSpotifyToken(spotifyApi);
  }

  // Google/YouTube Client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
  if (allTokens.google) {
    oauth2Client.setCredentials(allTokens.google);
  }
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  // Deezer is simpler, we just need the token
  const deezerToken = allTokens.deezer ? allTokens.deezer.access_token : null;

  return {
    spotify: spotifyApi,
    deezerToken: deezerToken,
    youtube: youtube,
    google: oauth2Client, // also export the base client
  };
}

module.exports = {
  saveTokens,
  getApiClients,
  getTokens,
  GOOGLE_REDIRECT_URI,
}; 