require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { google } = require('googleapis');
const { spotifyApi, oauth2Client } = require('./api-clients');
const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { startSyncEngine } = require('./sync-engine');
const { saveTokens } = require('./auth-manager');
const { 
  getSpotifyPlaylistTracks, searchSpotifyTrack, createSpotifyPlaylist,
  getDeezerPlaylistTracks, searchDeezerTrack, createDeezerPlaylist,
  getYouTubePlaylistTracks, searchYouTubeTrack, createYouTubePlaylist
} = require('./api-helpers');

const app = express();
const port = process.env.PORT || 3001;

// The spotifyApi and oauth2Client are now imported, so I remove their instantiation from here.

const scopes = [
  'ugc-image-upload',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'app-remote-control',
  'user-read-email',
  'user-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-read-private',
  'playlist-modify-private',
  'user-library-modify',
  'user-library-read',
  'user-top-read',
  'user-read-playback-position',
  'user-read-recently-played',
  'user-follow-read',
  'user-follow-modify'
];

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from Syncer Music Server!');
});

app.get('/auth/spotify', (req, res) => {
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/auth/spotify/callback', (req, res) => {
  const error = req.query.error;
  const code = req.query.code;

  if (error) {
    console.error('Callback Error:', error);
    res.send(`Callback Error: ${error}`);
    return;
  }

  spotifyApi.authorizationCodeGrant(code).then(async data => {
    const tokens = {
      access_token: data.body['access_token'],
      refresh_token: data.body['refresh_token'],
      expires_at: Date.now() + data.body['expires_in'] * 1000,
    };
    spotifyApi.setAccessToken(tokens.access_token);
    spotifyApi.setRefreshToken(tokens.refresh_token);
    await saveTokens('spotify', tokens);

    console.log('access_token:', tokens.access_token);
    console.log('refresh_token:', tokens.refresh_token);

    console.log(
      `Sucessfully retreived access token. Expires in ${data.body['expires_in']} s.`
    );
    res.redirect('http://localhost:5173'); // Redirect to frontend

  }).catch(error => {
    console.error('Error getting Tokens:', error);
    res.send(`Error getting Tokens: ${error}`);
  });
});

// Deezer Auth
const deezerAppId = process.env.DEEZER_APP_ID;
const deezerSecretKey = process.env.DEEZER_SECRET_KEY;
const deezerRedirectUri = 'http://localhost:3001/auth/deezer/callback';

let deezerAccessToken = '';

app.get('/auth/deezer', (req, res) => {
  const url = `https://connect.deezer.com/oauth/auth.php?app_id=${deezerAppId}&redirect_uri=${deezerRedirectUri}&perms=basic_access,email,manage_library,delete_library,offline_access`;
  res.redirect(url);
});

app.get('/auth/deezer/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const response = await axios.get(`https://connect.deezer.com/oauth/access_token.php?app_id=${deezerAppId}&secret=${deezerSecretKey}&code=${code}&output=json`);
    
    if (response.data.error) {
      throw new Error(response.data.error);
    }

    const tokens = {
      access_token: response.data.access_token,
      // Deezer refresh token is managed by 'offline_access' perm, not explicit
      expires_at: Date.now() + response.data.expires * 1000,
    };
    deezerAccessToken = tokens.access_token; // Keep for immediate use
    await saveTokens('deezer', tokens);
    console.log('Deezer Access Token:', deezerAccessToken);
    res.redirect('http://localhost:5173');
  } catch (error) {
    console.error('Deezer auth error:', error.message);
    res.status(500).send('Failed to authenticate with Deezer');
  }
});

// Google / YouTube Music Auth
const googleAuthScopes = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl'
];

let googleAuthTokens = {};

app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: googleAuthScopes
  });
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    await saveTokens('google', tokens);
    googleAuthTokens = tokens;
    console.log('Google Auth Tokens:', googleAuthTokens);
    res.redirect('http://localhost:5173');
  } catch (error) {
    console.error('Google auth error:', error.message);
    res.status(500).send('Failed to authenticate with Google');
  }
});

// Transfer Endpoint
app.post('/api/transfer', async (req, res) => {
  const { source, destination, playlistId, playlistName } = req.body;

  console.log(`Transfer request: ${playlistId} from ${source} to ${destination}`);

  let sourceTracks = [];
  if (source === 'spotify') {
    sourceTracks = await getSpotifyPlaylistTracks(spotifyApi, playlistId);
  } else if (source === 'deezer') {
    sourceTracks = await getDeezerPlaylistTracks(deezerAccessToken, playlistId);
  } else if (source === 'youtube') {
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    sourceTracks = await getYouTubePlaylistTracks(youtube, playlistId);
  }

  const destinationTracks = [];
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  for (const track of sourceTracks) {
    let foundTrack;
    if (destination === 'spotify') {
      foundTrack = await searchSpotifyTrack(spotifyApi, track);
    } else if (destination === 'deezer') {
      foundTrack = await searchDeezerTrack(track);
    } else if (destination === 'youtube') {
      foundTrack = await searchYouTubeTrack(youtube, track);
    }
    if (foundTrack) {
      destinationTracks.push(foundTrack);
    }
  }

  let newPlaylist;
  if (destination === 'spotify') {
    const trackUris = destinationTracks.map(t => t.uri).filter(Boolean);
    newPlaylist = await createSpotifyPlaylist(spotifyApi, playlistName, trackUris);
  } else if (destination === 'deezer') {
    const trackIds = destinationTracks.map(t => t.id).filter(Boolean);
    newPlaylist = await createDeezerPlaylist(deezerAccessToken, playlistName, trackIds);
  } else if (destination === 'youtube') {
    const videoIds = destinationTracks.map(t => t.id.videoId).filter(Boolean);
    newPlaylist = await createYouTubePlaylist(youtube, playlistName, videoIds);
  }

  if (newPlaylist) {
    res.json({ message: 'Transfer successful!', playlist: newPlaylist });
  } else {
    res.status(500).json({ message: 'Transfer failed.' });
  }
});

// Sync Endpoints
const SYNC_JOBS_PATH = path.join(__dirname, 'sync-jobs.json');

app.get('/api/sync/jobs', async (req, res) => {
  try {
    const jobs = JSON.parse(await fs.readFile(SYNC_JOBS_PATH, 'utf-8'));
    res.json(jobs);
  } catch (error) {
    console.error('Error reading sync jobs:', error);
    res.status(500).json({ message: 'Failed to get sync jobs.' });
  }
});

app.post('/api/sync/create', async (req, res) => {
  try {
    const { sourceService, sourcePlaylistId, destService, destPlaylistName } = req.body;
    const newJob = {
      id: uuidv4(),
      sourceService,
      sourcePlaylistId,
      destService,
      destPlaylistName,
      status: 'active',
      createdAt: new Date().toISOString(),
      // We will add destPlaylistId after its creation
    };
    const jobs = JSON.parse(await fs.readFile(SYNC_JOBS_PATH, 'utf-8'));
    jobs.push(newJob);
    await fs.writeFile(SYNC_JOBS_PATH, JSON.stringify(jobs, null, 2));
    res.status(201).json(newJob);
  } catch (error) {
    console.error('Error creating sync job:', error);
    res.status(500).json({ message: 'Failed to create sync job.' });
  }
});

// Settings Endpoint
app.post('/api/settings/save', async (req, res) => {
  const newSettings = req.body;
  const envFilePath = path.join(__dirname, '.env');

  try {
    let envFileContent = '';
    // Read existing .env file if it exists
    try {
      envFileContent = await fs.readFile(envFilePath, 'utf-8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error; // Rethrow if it's not a "file not found" error
      }
      // If the file doesn't exist, we'll create it.
    }

    const envLines = envFileContent.split('\n');
    const settingsMap = new Map();

    // Load existing settings into a map
    envLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key] = trimmedLine.split('=');
        settingsMap.set(key.trim(), line);
      }
    });

    // Update with new settings
    for (const [key, value] of Object.entries(newSettings)) {
      if (value) {
        settingsMap.set(key, `${key}=${value}`);
      }
    }

    const updatedEnvContent = Array.from(settingsMap.values()).join('\n');
    await fs.writeFile(envFilePath, updatedEnvContent);

    res.status(200).json({ message: 'Settings saved successfully. Please restart the server to apply changes.' });

  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ message: 'Failed to save settings to .env file.' });
  }
});

app.post('/api/server/restart', (req, res) => {
  console.log('Server restart requested from client.');
  res.status(200).json({ message: 'Server is restarting...' });
  // We exit the process so that nodemon can restart it automatically.
  setTimeout(() => {
    process.exit(1);
  }, 500); // Wait a moment to ensure the response is sent
});

// Share Endpoints
const SHARES_DIR = path.join(__dirname, 'shares');

app.post('/api/share/create', async (req, res) => {
  const { service, playlistId } = req.body;
  const { spotifyApi: freshSpotifyApi, deezerToken, youtubeClient } = await getApiClients(spotifyApi, oauth2Client);
  
  try {
    let sourceTracks = [];
    let playlistName = "A Shared Playlist";
    if (service === 'spotify') sourceTracks = await apiHelpers.getSpotifyPlaylistTracks(freshSpotifyApi, playlistId);
    else if (service === 'deezer') sourceTracks = await apiHelpers.getDeezerPlaylistTracks(deezerToken, playlistId);
    else if (service === 'youtube') sourceTracks = await apiHelpers.getYouTubePlaylistTracks(youtubeClient, playlistId);
    // TODO: Get real playlist name

    const tracksWithLinks = await Promise.all(sourceTracks.map(async (track) => {
      const spotifyTrack = service === 'spotify' ? track : await apiHelpers.searchSpotifyTrack(freshSpotifyApi, track);
      const deezerTrack = service === 'deezer' ? track : await apiHelpers.searchDeezerTrack(track);
      const youtubeTrack = service === 'youtube' ? track : await apiHelpers.searchYouTubeTrack(youtubeClient, track);

      return {
        name: track.name,
        artist: track.artist,
        links: {
          spotify: spotifyTrack ? (spotifyTrack.external_urls ? spotifyTrack.external_urls.spotify : null) : null,
          deezer: deezerTrack ? deezerTrack.link : null,
          youtube: youtubeTrack ? `https://www.youtube.com/watch?v=${youtubeTrack.id.videoId}` : null,
        }
      };
    }));

    const shareId = uuidv4();
    const shareData = {
      id: shareId,
      name: playlistName,
      sourceService: service,
      tracks: tracksWithLinks,
    };

    await fs.writeFile(path.join(SHARES_DIR, `${shareId}.json`), JSON.stringify(shareData, null, 2));
    res.status(201).json({ shareId });
  } catch (error) {
    console.error('Failed to create share:', error);
    res.status(500).json({ message: 'Failed to create share link.' });
  }
});

app.get('/api/share/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    const filePath = path.join(SHARES_DIR, `${shareId}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Failed to get share data:', error);
    res.status(404).json({ message: 'Share link not found.' });
  }
});


// All helper functions are now in api-helpers.js and imported at the top
// No need to redefine them here

app.get('/api/google/playlists', async (req, res) => {
  if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
    return res.status(401).json({ error: 'Not authenticated with Google' });
  }

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  try {
    const response = await youtube.playlists.list({
      mine: true,
      part: 'snippet,contentDetails',
      maxResults: 50
    });
    res.json(response.data.items);
  } catch (error) {
    console.error('Error fetching YouTube playlists:', error.message);
    res.status(500).json({ error: 'Failed to fetch YouTube playlists' });
  }
});


app.get('/api/deezer/playlists', async (req, res) => {
  if (!deezerAccessToken) {
    return res.status(401).json({ error: 'Not authenticated with Deezer' });
  }

  try {
    const response = await axios.get(`https://api.deezer.com/user/me/playlists?access_token=${deezerAccessToken}`);
    res.json(response.data.data);
  } catch (error) {
    console.error('Error fetching Deezer playlists:', error.message);
    res.status(500).json({ error: 'Failed to fetch Deezer playlists' });
  }
});


app.get('/api/spotify/playlists', (req, res) => {
  spotifyApi.getMe()
    .then(data => {
      return spotifyApi.getUserPlaylists(data.body.id);
    })
    .then(data => {
      const playlists = data.body.items;
      res.json(playlists);
    })
    .catch(error => {
      console.error('Error getting playlists:', error);
      res.status(500).json({ error: 'Failed to get playlists' });
    });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  startSyncEngine();
}); 