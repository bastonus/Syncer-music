const axios = require('axios');
const logger = require('../../utils/logger');

class DeezerService {
  constructor() {
    this.baseURL = 'https://api.deezer.com';
  }

  async getPlaylists(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/user/me/playlists`, {
        params: { access_token: accessToken, limit: 100 }
      });

      return response.data.data.map(playlist => ({
        id: playlist.id.toString(),
        name: playlist.title,
        description: playlist.description,
        trackCount: playlist.nb_tracks,
        public: playlist.public
      }));
    } catch (error) {
      logger.error('Erreur lors de la récupération des playlists Deezer:', error);
      throw error;
    }
  }

  async getPlaylistTracks(accessToken, playlistId) {
    try {
      let allTracks = [];
      let index = 0;
      const limit = 100;

      while (true) {
        const response = await axios.get(`${this.baseURL}/playlist/${playlistId}/tracks`, {
          params: { access_token: accessToken, index, limit }
        });

        const tracks = response.data.data.map(track => ({
          id: track.id.toString(),
          title: track.title,
          artist: track.artist.name,
          album: track.album.title,
          duration: track.duration * 1000, // Convertir en millisecondes
          isrc: track.isrc,
          uri: `deezer:track:${track.id}`
        }));

        allTracks = allTracks.concat(tracks);

        if (tracks.length < limit) break;
        index += limit;
      }

      return allTracks;
    } catch (error) {
      logger.error('Erreur lors de la récupération des pistes Deezer:', error);
      throw error;
    }
  }

  async createPlaylist(accessToken, name, description = '') {
    try {
      const response = await axios.post(`${this.baseURL}/user/me/playlists`, {
        title: name,
        description: description
      }, {
        params: { access_token: accessToken }
      });

      return {
        id: response.data.id.toString(),
        name: name,
        description: description
      };
    } catch (error) {
      logger.error('Erreur lors de la création de la playlist Deezer:', error);
      throw error;
    }
  }

  async addTracksToPlaylist(accessToken, playlistId, trackIds) {
    try {
      const trackIdsString = trackIds.join(',');
      await axios.post(`${this.baseURL}/playlist/${playlistId}/tracks`, {
        songs: trackIdsString
      }, {
        params: { access_token: accessToken }
      });
    } catch (error) {
      logger.error('Erreur lors de l\'ajout de pistes à la playlist Deezer:', error);
      throw error;
    }
  }

  async searchTrack(accessToken, title, artist) {
    try {
      const query = `track:"${title}" artist:"${artist}"`;
      const response = await axios.get(`${this.baseURL}/search/track`, {
        params: {
          q: query,
          limit: 1,
          access_token: accessToken
        }
      });

      if (response.data.data.length > 0) {
        const track = response.data.data[0];
        return {
          id: track.id.toString(),
          uri: `deezer:track:${track.id}`,
          title: track.title,
          artist: track.artist.name
        };
      }

      return null;
    } catch (error) {
      logger.error('Erreur lors de la recherche de piste Deezer:', error);
      throw error;
    }
  }

  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/user/me`, {
        params: { access_token: accessToken }
      });

      return {
        id: response.data.id.toString(),
        name: response.data.name,
        email: response.data.email
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération du profil Deezer:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken) {
    try {
      const response = await axios.post('https://connect.deezer.com/oauth/access_token.php', 
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.DEEZER_CLIENT_ID,
          client_secret: process.env.DEEZER_CLIENT_SECRET
        })
      );

      // Deezer retourne les données sous forme de chaîne query string
      const params = new URLSearchParams(response.data);
      return {
        access_token: params.get('access_token'),
        expires_in: parseInt(params.get('expires_in'))
      };
    } catch (error) {
      logger.error('Erreur lors du rafraîchissement du token Deezer:', error);
      throw error;
    }
  }
}

module.exports = new DeezerService(); 