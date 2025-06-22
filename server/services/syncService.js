const { db } = require('../database/init');
const spotifyService = require('./platforms/spotify');
const deezerService = require('./platforms/deezer');
const youtubeMusicService = require('./platforms/youtubeMusic');
const logger = require('../utils/logger');

const platformServices = {
  spotify: spotifyService,
  deezer: deezerService,
  youtube: youtubeMusicService
};

async function syncPlaylist(userId, playlistId) {
  const syncResults = {
    success: false,
    errors: [],
    details: {},
    tracksProcessed: 0,
    tracksSynced: 0
  };

  try {
    // Récupérer les connexions de l'utilisateur
    const connections = await getValidConnections(userId);
    
    if (connections.length < 2) {
      throw new Error('Au moins deux plateformes doivent être connectées pour la synchronisation');
    }

    // Récupérer la playlist
    const playlist = await db.get('SELECT * FROM playlists WHERE id = ? AND user_id = ?', [playlistId, userId]);
    if (!playlist) {
      throw new Error('Playlist non trouvée');
    }

    logger.info(`Début de synchronisation: playlist "${playlist.name}" pour l'utilisateur ${userId}`);

    // Récupérer les playlists sur chaque plateforme
    const platformPlaylists = await db.all(`
      SELECT * FROM platform_playlists WHERE playlist_id = ?
    `, [playlistId]);

    // Créer un map des playlists par plateforme
    const playlistMap = {};
    platformPlaylists.forEach(pp => {
      playlistMap[pp.platform] = pp;
    });

    // Récupérer les pistes de toutes les plateformes
    const allTracks = new Map(); // key: isrc ou title+artist, value: track info
    const platformTracks = {}; // platform -> tracks

    for (const connection of connections) {
      try {
        const service = platformServices[connection.platform];
        if (!service) continue;

        const platformPlaylist = playlistMap[connection.platform];
        if (!platformPlaylist) {
          // Créer la playlist sur cette plateforme
          const newPlaylist = await createPlaylistOnPlatform(
            service, 
            connection, 
            playlist.name, 
            playlist.description
          );
          
          await db.run(`
            INSERT INTO platform_playlists 
            (playlist_id, platform, platform_playlist_id, platform_playlist_name)
            VALUES (?, ?, ?, ?)
          `, [playlistId, connection.platform, newPlaylist.id, newPlaylist.name]);
          
          playlistMap[connection.platform] = {
            platform_playlist_id: newPlaylist.id,
            platform: connection.platform
          };
          
          platformTracks[connection.platform] = [];
          continue;
        }

        // Récupérer les pistes existantes
        const tracks = await service.getPlaylistTracks(
          connection.access_token, 
          platformPlaylist.platform_playlist_id
        );
        
        platformTracks[connection.platform] = tracks;

        // Ajouter les pistes à la collection globale
        tracks.forEach(track => {
          const key = track.isrc || `${track.title.toLowerCase()}_${track.artist.toLowerCase()}`;
          if (!allTracks.has(key)) {
            allTracks.set(key, {
              title: track.title,
              artist: track.artist,
              album: track.album,
              duration: track.duration,
              isrc: track.isrc,
              platforms: {}
            });
          }
          allTracks.get(key).platforms[connection.platform] = track;
        });

      } catch (error) {
        logger.error(`Erreur lors de la récupération des pistes ${connection.platform}:`, error);
        syncResults.errors.push(`${connection.platform}: ${error.message}`);
      }
    }

    syncResults.tracksProcessed = allTracks.size;

    // Synchroniser les pistes manquantes sur chaque plateforme
    for (const connection of connections) {
      try {
        const service = platformServices[connection.platform];
        if (!service) continue;

        const platformPlaylist = playlistMap[connection.platform];
        if (!platformPlaylist) continue;

        const existingTracks = platformTracks[connection.platform] || [];
        const existingTrackKeys = new Set();
        
        existingTracks.forEach(track => {
          const key = track.isrc || `${track.title.toLowerCase()}_${track.artist.toLowerCase()}`;
          existingTrackKeys.add(key);
        });

        const tracksToAdd = [];
        
        for (const [key, trackInfo] of allTracks) {
          if (!existingTrackKeys.has(key)) {
            // Cette piste n'existe pas sur cette plateforme, essayer de la trouver
            const foundTrack = await searchTrackOnPlatform(
              service, 
              connection.access_token, 
              trackInfo.title, 
              trackInfo.artist
            );
            
            if (foundTrack) {
              tracksToAdd.push(foundTrack);
              syncResults.tracksSynced++;
            }
          }
        }

        if (tracksToAdd.length > 0) {
          await addTracksToPlaylistOnPlatform(
            service,
            connection.access_token,
            platformPlaylist.platform_playlist_id,
            tracksToAdd,
            connection.platform
          );
          
          logger.info(`${tracksToAdd.length} pistes ajoutées à ${connection.platform}`);
        }

        syncResults.details[connection.platform] = {
          existingTracks: existingTracks.length,
          tracksAdded: tracksToAdd.length
        };

        // Mettre à jour la date de dernière synchronisation
        await db.run(`
          UPDATE platform_playlists 
          SET last_synced_at = datetime('now')
          WHERE playlist_id = ? AND platform = ?
        `, [playlistId, connection.platform]);

      } catch (error) {
        logger.error(`Erreur lors de la synchronisation sur ${connection.platform}:`, error);
        syncResults.errors.push(`${connection.platform}: ${error.message}`);
      }
    }

    syncResults.success = syncResults.errors.length === 0;

    // Enregistrer le log de synchronisation
    await db.run(`
      INSERT INTO sync_logs (user_id, playlist_id, action, platform, status, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userId, 
      playlistId, 
      'sync', 
      'all', 
      syncResults.success ? 'success' : 'partial', 
      JSON.stringify(syncResults)
    ]);

    logger.info(`Synchronisation terminée: ${syncResults.tracksSynced}/${syncResults.tracksProcessed} pistes synchronisées`);
    return syncResults;

  } catch (error) {
    logger.error('Erreur lors de la synchronisation:', error);
    
    await db.run(`
      INSERT INTO sync_logs (user_id, playlist_id, action, platform, status, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, playlistId, 'sync', 'all', 'error', error.message]);

    throw error;
  }
}

async function getValidConnections(userId) {
  const connections = await db.all(`
    SELECT * FROM platform_connections 
    WHERE user_id = ? AND expires_at > datetime('now')
  `, [userId]);

  const validConnections = [];

  for (const connection of connections) {
    try {
      // Vérifier si le token doit être rafraîchi
      const expiresAt = new Date(connection.expires_at);
      const now = new Date();
      const timeUntilExpiry = expiresAt - now;

      if (timeUntilExpiry < 5 * 60 * 1000 && connection.refresh_token) { // 5 minutes
        // Rafraîchir le token
        const service = platformServices[connection.platform];
        if (service && service.refreshToken) {
          const newTokenData = await service.refreshToken(connection.refresh_token);
          
          const newExpiresAt = new Date(Date.now() + newTokenData.expires_in * 1000);
          
          await db.run(`
            UPDATE platform_connections 
            SET access_token = ?, expires_at = ?, updated_at = datetime('now')
            WHERE id = ?
          `, [newTokenData.access_token, newExpiresAt, connection.id]);

          connection.access_token = newTokenData.access_token;
          connection.expires_at = newExpiresAt;
        }
      }

      validConnections.push(connection);
    } catch (error) {
      logger.error(`Erreur lors de la validation du token ${connection.platform}:`, error);
    }
  }

  return validConnections;
}

async function createPlaylistOnPlatform(service, connection, name, description) {
  switch (connection.platform) {
    case 'spotify':
      return await service.createPlaylist(connection.access_token, connection.platform_user_id, name, description);
    case 'deezer':
      return await service.createPlaylist(connection.access_token, name, description);
    case 'youtube':
      return await service.createPlaylist(connection.access_token, name, description);
    default:
      throw new Error(`Plateforme non supportée: ${connection.platform}`);
  }
}

async function searchTrackOnPlatform(service, accessToken, title, artist) {
  try {
    return await service.searchTrack(accessToken, title, artist);
  } catch (error) {
    logger.warn(`Impossible de trouver la piste "${title}" par "${artist}":`, error.message);
    return null;
  }
}

async function addTracksToPlaylistOnPlatform(service, accessToken, playlistId, tracks, platform) {
  switch (platform) {
    case 'spotify':
      const spotifyUris = tracks.map(t => t.uri);
      await service.addTracksToPlaylist(accessToken, playlistId, spotifyUris);
      break;
    case 'deezer':
      const deezerIds = tracks.map(t => t.id);
      await service.addTracksToPlaylist(accessToken, playlistId, deezerIds);
      break;
    case 'youtube':
      const videoIds = tracks.map(t => t.id);
      await service.addTracksToPlaylist(accessToken, playlistId, videoIds);
      break;
    default:
      throw new Error(`Plateforme non supportée: ${platform}`);
  }
}

module.exports = {
  syncPlaylist,
  getValidConnections
}; 