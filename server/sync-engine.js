const fs = require('fs/promises');
const path = require('path');
const apiHelpers = require('./api-helpers');
const { getApiClients } = require('./auth-manager');
const { spotifyApi, oauth2Client } = require('./api-clients');

const SYNC_JOBS_PATH = path.join(__dirname, 'sync-jobs.json');
const SYNC_INTERVAL = 60 * 1000; // 1 minute

async function runSync() {
  console.log('Sync Engine: Checking for jobs...');
  let jobs = [];
  try {
    jobs = JSON.parse(await fs.readFile(SYNC_JOBS_PATH, 'utf-8'));
  } catch (e) {
    console.log('Sync Engine: No sync-jobs.json file found. Skipping.');
    return;
  }
  
  const activeJobs = jobs.filter(job => job.status === 'active');

  if (activeJobs.length === 0) {
    console.log('Sync Engine: No active jobs to process.');
    return;
  }

  // This now gets the clients with refreshed tokens
  const { spotifyApi: freshSpotifyApi, deezerToken, youtubeClient } = await getApiClients(spotifyApi, oauth2Client);

  for (const job of activeJobs) {
    console.log(`Sync Engine: Processing job ${job.id}...`);
    
    try {
      // 1. Get/Create destination playlist
      if (!job.destPlaylistId) {
        let newPlaylist;
        if (job.destService === 'spotify') {
          newPlaylist = await apiHelpers.createSpotifyPlaylist(freshSpotifyApi, job.destPlaylistName, []);
        } else if (job.destService === 'deezer') {
          newPlaylist = await apiHelpers.createDeezerPlaylist(deezerToken, job.destPlaylistName, []);
        } else if (job.destService === 'youtube') {
          newPlaylist = await apiHelpers.createYouTubePlaylist(youtubeClient, job.destPlaylistName, []);
        }
        if (newPlaylist) {
          job.destPlaylistId = newPlaylist.id;
          console.log(`Sync Engine: Created destination playlist for job ${job.id} with ID ${job.destPlaylistId}`);
        } else {
          throw new Error('Failed to create destination playlist.');
        }
      }

      // 2. Get source and dest tracks
      let sourceTracks = [];
      if (job.sourceService === 'spotify') sourceTracks = await apiHelpers.getSpotifyPlaylistTracks(freshSpotifyApi, job.sourcePlaylistId);
      else if (job.sourceService === 'deezer') sourceTracks = await apiHelpers.getDeezerPlaylistTracks(deezerToken, job.sourcePlaylistId);
      else if (job.sourceService === 'youtube') sourceTracks = await apiHelpers.getYouTubePlaylistTracks(youtubeClient, job.sourcePlaylistId);

      let destTracks = [];
      if (job.destService === 'spotify') destTracks = await apiHelpers.getSpotifyPlaylistTracks(freshSpotifyApi, job.destPlaylistId);
      else if (job.destService === 'deezer') destTracks = await apiHelpers.getDeezerPlaylistTracks(deezerToken, job.destPlaylistId);
      // YouTube doesn't easily provide a way to get playlist *item* ids for removal, so we skip removal for now.

      // 3. Diff tracks
      const sourceTrackIds = new Set(sourceTracks.map(t => `${t.name.toLowerCase()}|${t.artist.toLowerCase()}`));
      const destTrackIds = new Set(destTracks.map(t => `${t.name.toLowerCase()}|${t.artist.toLowerCase()}`));

      const tracksToAdd = sourceTracks.filter(t => !destTrackIds.has(`${t.name.toLowerCase()}|${t.artist.toLowerCase()}`));
      
      console.log(`Sync Engine: Job ${job.id}: Found ${tracksToAdd.length} tracks to add.`);

      if (tracksToAdd.length > 0) {
        const searchPromises = tracksToAdd.map(track => {
          if (job.destService === 'spotify') return apiHelpers.searchSpotifyTrack(freshSpotifyApi, track);
          if (job.destService === 'deezer') return apiHelpers.searchDeezerTrack(track);
          if (job.destService === 'youtube') return apiHelpers.searchYouTubeTrack(youtubeClient, track);
          return null;
        });

        const foundTracks = (await Promise.all(searchPromises)).filter(Boolean);

        if (job.destService === 'spotify') {
          const trackUris = foundTracks.map(t => t.uri).filter(Boolean);
          if (trackUris.length > 0) await freshSpotifyApi.addTracksToPlaylist(job.destPlaylistId, trackUris);
        } else if (job.destService === 'deezer') {
          const trackIds = foundTracks.map(t => t.id);
          if (trackIds.length > 0) await apiHelpers.addTracksToDeezerPlaylist(deezerToken, job.destPlaylistId, trackIds);
        } else if (job.destService === 'youtube') {
          const videoIds = foundTracks.map(t => t.id.videoId);
          if (videoIds.length > 0) await apiHelpers.addTracksToYouTubePlaylist(youtubeClient, job.destPlaylistId, videoIds);
        }
      }
      
      job.lastSync = new Date().toISOString();
      job.lastStatus = 'success';
    } catch (error) {
      console.error(`Sync Engine: Failed to process job ${job.id}:`, error);
      job.lastStatus = 'error';
    }
  }
  
  // Update the jobs file with new playlist IDs and statuses
  await fs.writeFile(SYNC_JOBS_PATH, JSON.stringify(jobs, null, 2));
}

function startSyncEngine() {
  console.log('Sync Engine: Starting...');
  runSync();
  setInterval(runSync, SYNC_INTERVAL);
}

module.exports = { startSyncEngine }; 