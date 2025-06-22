const cron = require('node-cron');
const { db } = require('../database/init');
const { syncPlaylist } = require('./syncService');
const logger = require('../utils/logger');

let syncTask;

function startSyncScheduler() {
  // Synchronisation toutes les 30 minutes
  syncTask = cron.schedule('*/30 * * * *', async () => {
    try {
      logger.info('Début de la synchronisation programmée');
      await performScheduledSync();
      logger.info('Synchronisation programmée terminée');
    } catch (error) {
      logger.error('Erreur lors de la synchronisation programmée:', error);
    }
  });

  // Synchronisation au démarrage après 1 minute
  setTimeout(async () => {
    try {
      logger.info('Synchronisation initiale au démarrage');
      await performScheduledSync();
    } catch (error) {
      logger.error('Erreur lors de la synchronisation initiale:', error);
    }
  }, 60000);

  logger.info('Planificateur de synchronisation démarré');
}

function stopSyncScheduler() {
  if (syncTask) {
    syncTask.destroy();
    logger.info('Planificateur de synchronisation arrêté');
  }
}

async function performScheduledSync() {
  try {
    // Récupérer toutes les playlists avec synchronisation activée
    const playlists = await db.all(`
      SELECT p.*, u.id as user_id
      FROM playlists p
      JOIN users u ON p.user_id = u.id
      WHERE p.sync_enabled = 1
    `);

    for (const playlist of playlists) {
      try {
        // Vérifier si l'utilisateur a des connexions aux plateformes
        const connections = await db.all(`
          SELECT * FROM platform_connections 
          WHERE user_id = ? AND expires_at > datetime('now')
        `, [playlist.user_id]);

        if (connections.length < 2) {
          logger.warn(`Utilisateur ${playlist.user_id} n'a pas assez de connexions pour la synchronisation`);
          continue;
        }

        // Vérifier la dernière synchronisation
        const lastSync = await db.get(`
          SELECT MAX(created_at) as last_sync_time
          FROM sync_logs
          WHERE playlist_id = ? AND status = 'success'
        `, [playlist.id]);

        const lastSyncTime = lastSync?.last_sync_time ? new Date(lastSync.last_sync_time) : new Date(0);
        const now = new Date();
        const timeDiff = now - lastSyncTime;

        // Synchroniser seulement si plus de 25 minutes se sont écoulées
        if (timeDiff > 25 * 60 * 1000) {
          logger.info(`Synchronisation de la playlist ${playlist.name} (ID: ${playlist.id})`);
          
          await syncPlaylist(playlist.user_id, playlist.id);
          
          // Ajouter un délai entre les synchronisations pour éviter les limites de taux
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (error) {
        logger.error(`Erreur lors de la synchronisation de la playlist ${playlist.id}:`, error);
        
        // Enregistrer l'erreur dans les logs
        await db.run(`
          INSERT INTO sync_logs (user_id, playlist_id, action, platform, status, message)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [playlist.user_id, playlist.id, 'scheduled_sync', 'all', 'error', error.message]);
      }
    }
  } catch (error) {
    logger.error('Erreur dans performScheduledSync:', error);
    throw error;
  }
}

// Synchronisation manuelle d'une playlist spécifique
async function syncPlaylistNow(userId, playlistId) {
  try {
    logger.info(`Synchronisation manuelle demandée pour la playlist ${playlistId} par l'utilisateur ${userId}`);
    
    const result = await syncPlaylist(userId, playlistId);
    
    return result;
  } catch (error) {
    logger.error(`Erreur lors de la synchronisation manuelle de la playlist ${playlistId}:`, error);
    throw error;
  }
}

// Fonction pour obtenir le statut de synchronisation
async function getSyncStatus(userId, playlistId = null) {
  try {
    let query = `
      SELECT 
        sl.*,
        p.name as playlist_name
      FROM sync_logs sl
      LEFT JOIN playlists p ON sl.playlist_id = p.id
      WHERE sl.user_id = ?
    `;
    const params = [userId];

    if (playlistId) {
      query += ' AND sl.playlist_id = ?';
      params.push(playlistId);
    }

    query += ' ORDER BY sl.created_at DESC LIMIT 50';

    const logs = await db.all(query, params);
    
    return logs;
  } catch (error) {
    logger.error('Erreur lors de la récupération du statut de synchronisation:', error);
    throw error;
  }
}

// Fonction pour obtenir les statistiques de synchronisation
async function getSyncStats(userId) {
  try {
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_syncs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_syncs,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_syncs,
        MAX(created_at) as last_sync
      FROM sync_logs
      WHERE user_id = ?
    `, [userId]);

    const playlistStats = await db.all(`
      SELECT 
        p.name as playlist_name,
        COUNT(sl.id) as sync_count,
        MAX(sl.created_at) as last_sync,
        SUM(CASE WHEN sl.status = 'success' THEN 1 ELSE 0 END) as successful_syncs
      FROM playlists p
      LEFT JOIN sync_logs sl ON p.id = sl.playlist_id
      WHERE p.user_id = ?
      GROUP BY p.id, p.name
      ORDER BY sync_count DESC
    `, [userId]);

    return {
      overall: stats,
      playlists: playlistStats
    };
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    throw error;
  }
}

module.exports = {
  startSyncScheduler,
  stopSyncScheduler,
  syncPlaylistNow,
  getSyncStatus,
  getSyncStats
}; 