const axios = require('axios');
const logger = require('../../utils/logger');

class SpotifyService {
  constructor() {
    this.baseURL = 'https://api.spotify.com/v1';
    this.authURL = 'https://accounts.spotify.com';
  }

  async refreshToken(refreshToken) {
    try {
      const response = await axios.post(`${this.authURL}/api/token`, 
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }), {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Erreur lors du rafraîchissement du token Spotify:', error);
      throw error;
    }
  }

  async getPlaylists(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/me/playlists`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: { limit: 50 }
      });

      return response.data.items.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        trackCount: playlist.tracks.total,
        public: playlist.public,
        collaborative: playlist.collaborative
      }));
    } catch (error) {
      logger.error('Erreur lors de la récupération des playlists Spotify:', error);
      throw error;
    }
  }

  async getPlaylistTracks(accessToken, playlistId) {
    try {
      let allTracks = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const response = await axios.get(`${this.baseURL}/playlists/${playlistId}/tracks`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          params: { offset, limit, fields: 'items(track(id,name,artists,album,duration_ms,external_ids)),next' }
        });

        const tracks = response.data.items
          .filter(item => item.track && item.track.id)
          .map(item => ({
            id: item.track.id,
            title: item.track.name,
            artist: item.track.artists.map(a => a.name).join(', '),
            album: item.track.album.name,
            duration: item.track.duration_ms,
            isrc: item.track.external_ids?.isrc,
            uri: `spotify:track:${item.track.id}`
          }));

        allTracks = allTracks.concat(tracks);

        if (!response.data.next) break;
        offset += limit;
      }

      return allTracks;
    } catch (error) {
      logger.error('Erreur lors de la récupération des pistes Spotify:', error);
      throw error;
    }
  }

  async createPlaylist(accessToken, userId, name, description = '') {
    try {
      const response = await axios.post(`${this.baseURL}/users/${userId}/playlists`, {
        name,
        description,
        public: false
      }, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      return {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description
      };
    } catch (error) {
      logger.error('Erreur lors de la création de la playlist Spotify:', error);
      throw error;
    }
  }

  async addTracksToPlaylist(accessToken, playlistId, trackUris) {
    try {
      const batchSize = 100;
      const batches = [];

      for (let i = 0; i < trackUris.length; i += batchSize) {
        batches.push(trackUris.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        await axios.post(`${this.baseURL}/playlists/${playlistId}/tracks`, {
          uris: batch
        }, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
      }
    } catch (error) {
      logger.error('Erreur lors de l\'ajout de pistes à la playlist Spotify:', error);
      throw error;
    }
  }

  async searchTrack(accessToken, title, artist) {
    try {
      const query = `track:"${title}" artist:"${artist}"`;
      const response = await axios.get(`${this.baseURL}/search`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: {
          q: query,
          type: 'track',
          limit: 1
        }
      });

      if (response.data.tracks.items.length > 0) {
        const track = response.data.tracks.items[0];
        return {
          id: track.id,
          uri: track.uri,
          title: track.name,
          artist: track.artists.map(a => a.name).join(', ')
        };
      }

      return null;
    } catch (error) {
      logger.error('Erreur lors de la recherche de piste Spotify:', error);
      throw error;
    }
  }

  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/me`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      return {
        id: response.data.id,
        name: response.data.display_name,
        email: response.data.email
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération du profil Spotify:', error);
      throw error;
    }
  }
}

module.exports = new SpotifyService(); 