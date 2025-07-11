const axios = require('axios');
const { google } = require('googleapis');

// ==================
// Spotify Helpers
// ==================

async function getSpotifyPlaylistTracks(spotifyApi, playlistId) {
  try {
    const response = await spotifyApi.getPlaylistTracks(playlistId, { limit: 50 });
    return response.body.items.map(item => ({
      name: item.track.name,
      artist: item.track.artists[0].name,
      album: item.track.album.name,
      isrc: item.track.external_ids.isrc,
      uri: item.track.uri,
    }));
  } catch (error) {
    console.error('Error getting Spotify playlist tracks:', error);
    return [];
  }
}

async function searchSpotifyTrack(spotifyApi, track) {
  if (track.isrc) {
    try {
      const response = await spotifyApi.searchTracks(`isrc:${track.isrc}`);
      if (response.body.tracks.items.length > 0) {
        return response.body.tracks.items[0];
      }
    } catch (e) { /* Fallback to search */ }
  }
  const query = `track:${track.name} artist:${track.artist}`;
  const response = await spotifyApi.searchTracks(query);
  return response.body.tracks.items[0] || null;
}

async function createSpotifyPlaylist(spotifyApi, name, trackUris) {
  try {
    const me = await spotifyApi.getMe();
    const newPlaylist = await spotifyApi.createPlaylist(me.body.id, { name, public: false });
    if (trackUris.length > 0) {
      await spotifyApi.addTracksToPlaylist(newPlaylist.body.id, trackUris);
    }
    return newPlaylist.body;
  } catch (error) {
    console.error('Error creating Spotify playlist:', error);
    return null;
  }
}

// ==================
// Deezer Helpers
// ==================

async function getDeezerPlaylistTracks(accessToken, playlistId) {
  try {
    const response = await axios.get(`https://api.deezer.com/playlist/${playlistId}/tracks?access_token=${accessToken}`);
    return response.data.data.map(item => ({
      name: item.title,
      artist: item.artist.name,
      album: item.album.title,
      isrc: item.isrc,
      id: item.id
    }));
  } catch (error) {
    console.error('Error getting Deezer playlist tracks:', error);
    return [];
  }
}

async function searchDeezerTrack(track) {
  if (track.isrc) {
    try {
      const response = await axios.get(`https://api.deezer.com/track/isrc:${track.isrc}`);
      if (response.data && !response.data.error) return response.data;
    } catch (e) { /* Fallback */ }
  }
  const query = `artist:"${track.artist}" track:"${track.name}"`;
  const response = await axios.get(`https://api.deezer.com/search?q=${encodeURIComponent(query)}`);
  return response.data.data[0] || null;
}

async function createDeezerPlaylist(accessToken, name, trackIds) {
  try {
    const response = await axios.post(`https://api.deezer.com/user/me/playlists?access_token=${accessToken}&title=${name}`);
    const playlistId = response.data.id;
    if (trackIds.length > 0) {
      await axios.post(`https://api.deezer.com/playlist/${playlistId}/tracks?access_token=${accessToken}&songs=${trackIds.join(',')}`);
    }
    return { id: playlistId, name };
  } catch (error) {
    console.error('Error creating Deezer playlist:', error);
    return null;
  }
}

async function addTracksToDeezerPlaylist(accessToken, playlistId, trackIds) {
  if (trackIds.length === 0) return true;
  try {
    await axios.post(`https://api.deezer.com/playlist/${playlistId}/tracks?access_token=${accessToken}&songs=${trackIds.join(',')}`);
    return true;
  } catch (error) {
    console.error('Error adding tracks to Deezer playlist:', error);
    return false;
  }
}

// ==================
// YouTube Helpers
// ==================

async function getYouTubePlaylistTracks(youtubeApiClient, playlistId) {
  try {
    const response = await youtubeApiClient.playlistItems.list({
      playlistId: playlistId,
      part: 'snippet',
      maxResults: 50
    });
    return response.data.items.map(item => ({
      name: item.snippet.title,
      artist: item.snippet.videoOwnerChannelTitle.replace(' - Topic', ''),
      album: '',
      isrc: '', // Not available
      id: item.snippet.resourceId.videoId
    }));
  } catch (error) {
    console.error('Error getting YouTube playlist tracks:', error);
    return [];
  }
}

async function searchYouTubeTrack(youtubeApiClient, track) {
  const query = `${track.name} ${track.artist}`;
  try {
    const response = await youtubeApiClient.search.list({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: 1
    });
    return response.data.items[0] || null;
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return null;
  }
}

async function createYouTubePlaylist(youtubeApiClient, name, videoIds) {
  try {
    const newPlaylist = await youtubeApiClient.playlists.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: { title: name, description: 'Created by Syncer Music' },
        status: { privacyStatus: 'private' }
      }
    });
    const playlistId = newPlaylist.data.id;
    for (const videoId of videoIds) {
      await youtubeApiClient.playlistItems.insert({
        part: 'snippet',
        requestBody: {
          snippet: {
            playlistId: playlistId,
            resourceId: { kind: 'youtube#video', videoId: videoId }
          }
        }
      });
    }
    return newPlaylist.data;
  } catch (error) {
    console.error('Error creating YouTube playlist:', error);
    return null;
  }
}

async function addTracksToYouTubePlaylist(youtubeApiClient, playlistId, videoIds) {
  if (videoIds.length === 0) return true;
  try {
    for (const videoId of videoIds) {
      await youtubeApiClient.playlistItems.insert({
        part: 'snippet',
        requestBody: {
          snippet: {
            playlistId: playlistId,
            resourceId: { kind: 'youtube#video', videoId: videoId }
          }
        }
      });
    }
    return true;
  } catch (error) {
    console.error('Error adding tracks to YouTube playlist:', error);
    return false;
  }
}


module.exports = {
  getSpotifyPlaylistTracks,
  searchSpotifyTrack,
  createSpotifyPlaylist,
  getDeezerPlaylistTracks,
  searchDeezerTrack,
  createDeezerPlaylist,
  getYouTubePlaylistTracks,
  searchYouTubeTrack,
  createYouTubePlaylist,
  addTracksToDeezerPlaylist,
  addTracksToYouTubePlaylist,
}; 