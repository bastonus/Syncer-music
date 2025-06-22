const axios = require('axios');
const logger = require('../../utils/logger');

class YouTubeMusicService {
  constructor() {
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
    this.musicBaseURL = 'https://music.youtube.com';
  }

  async refreshToken(refreshToken) {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET
      });

      return response.data;
    } catch (error) {
      logger.error('Erreur lors du rafraîchissement du token YouTube Music:', error);
      throw error;
    }
  }

  async getPlaylists(accessToken) {
    try {
      let allPlaylists = [];
      let nextPageToken = '';

      while (true) {
        const response = await axios.get(`${this.baseURL}/playlists`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          params: {
            part: 'snippet,contentDetails',
            mine: true,
            maxResults: 50,
            pageToken: nextPageToken
          }
        });

        const playlists = response.data.items.map(playlist => ({
          id: playlist.id,
          name: playlist.snippet.title,
          description: playlist.snippet.description,
          trackCount: playlist.contentDetails.itemCount,
          public: playlist.snippet.privacyStatus === 'public'
        }));

        allPlaylists = allPlaylists.concat(playlists);

        if (!response.data.nextPageToken) break;
        nextPageToken = response.data.nextPageToken;
      }

      return allPlaylists;
    } catch (error) {
      logger.error('Erreur lors de la récupération des playlists YouTube Music:', error);
      throw error;
    }
  }

  async getPlaylistTracks(accessToken, playlistId) {
    try {
      let allTracks = [];
      let nextPageToken = '';

      while (true) {
        const response = await axios.get(`${this.baseURL}/playlistItems`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          params: {
            part: 'snippet,contentDetails',
            playlistId: playlistId,
            maxResults: 50,
            pageToken: nextPageToken
          }
        });

        const tracks = response.data.items
          .filter(item => item.snippet.resourceId.kind === 'youtube#video')
          .map(item => ({
            id: item.snippet.resourceId.videoId,
            title: this.extractTitle(item.snippet.title),
            artist: this.extractArtist(item.snippet.title),
            album: '',
            duration: 0, // YouTube ne fournit pas toujours la durée
            uri: `youtube:video:${item.snippet.resourceId.videoId}`,
            originalTitle: item.snippet.title
          }));

        allTracks = allTracks.concat(tracks);

        if (!response.data.nextPageToken) break;
        nextPageToken = response.data.nextPageToken;
      }

      return allTracks;
    } catch (error) {
      logger.error('Erreur lors de la récupération des pistes YouTube Music:', error);
      throw error;
    }
  }

  async createPlaylist(accessToken, name, description = '') {
    try {
      const response = await axios.post(`${this.baseURL}/playlists`, {
        snippet: {
          title: name,
          description: description,
          privacyStatus: 'private'
        }
      }, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: { part: 'snippet' }
      });

      return {
        id: response.data.id,
        name: response.data.snippet.title,
        description: response.data.snippet.description
      };
    } catch (error) {
      logger.error('Erreur lors de la création de la playlist YouTube Music:', error);
      throw error;
    }
  }

  async addTracksToPlaylist(accessToken, playlistId, videoIds) {
    try {
      for (const videoId of videoIds) {
        await axios.post(`${this.baseURL}/playlistItems`, {
          snippet: {
            playlistId: playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: videoId
            }
          }
        }, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          params: { part: 'snippet' }
        });

        // Petit délai pour éviter les limites de taux
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      logger.error('Erreur lors de l\'ajout de pistes à la playlist YouTube Music:', error);
      throw error;
    }
  }

  async searchTrack(accessToken, title, artist) {
    try {
      const query = `${title} ${artist}`;
      const response = await axios.get(`${this.baseURL}/search`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          videoCategoryId: '10', // Catégorie Musique
          maxResults: 5
        }
      });

      // Filtrer les résultats pour trouver la meilleure correspondance
      for (const item of response.data.items) {
        const videoTitle = item.snippet.title.toLowerCase();
        const searchTitle = title.toLowerCase();
        const searchArtist = artist.toLowerCase();

        if (videoTitle.includes(searchTitle) && videoTitle.includes(searchArtist)) {
          return {
            id: item.id.videoId,
            uri: `youtube:video:${item.id.videoId}`,
            title: this.extractTitle(item.snippet.title),
            artist: this.extractArtist(item.snippet.title),
            originalTitle: item.snippet.title
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Erreur lors de la recherche de piste YouTube Music:', error);
      throw error;
    }
  }

  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/channels`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: {
          part: 'snippet',
          mine: true
        }
      });

      if (response.data.items.length > 0) {
        const channel = response.data.items[0];
        return {
          id: channel.id,
          name: channel.snippet.title,
          email: null // YouTube ne fournit pas l'email via cette API
        };
      }

      return null;
    } catch (error) {
      logger.error('Erreur lors de la récupération du profil YouTube Music:', error);
      throw error;
    }
  }

  // Méthodes utilitaires pour extraire le titre et l'artiste du titre YouTube
  extractTitle(youtubeTitle) {
    // Patterns courants : "Artist - Title", "Title - Artist", "Artist: Title"
    const patterns = [
      /^(.+?)\s*-\s*(.+?)$/,
      /^(.+?)\s*:\s*(.+?)$/,
      /^(.+?)\s*\|\s*(.+?)$/
    ];

    for (const pattern of patterns) {
      const match = youtubeTitle.match(pattern);
      if (match) {
        // Supposer que le titre est le deuxième groupe dans la plupart des cas
        return match[2].trim();
      }
    }

    return youtubeTitle; // Retourner le titre original si aucun pattern ne correspond
  }

  extractArtist(youtubeTitle) {
    // Patterns courants : "Artist - Title", "Title - Artist", "Artist: Title"
    const patterns = [
      /^(.+?)\s*-\s*(.+?)$/,
      /^(.+?)\s*:\s*(.+?)$/,
      /^(.+?)\s*\|\s*(.+?)$/
    ];

    for (const pattern of patterns) {
      const match = youtubeTitle.match(pattern);
      if (match) {
        // Supposer que l'artiste est le premier groupe dans la plupart des cas
        return match[1].trim();
      }
    }

    return 'Artiste inconnu';
  }
}

module.exports = new YouTubeMusicService(); 