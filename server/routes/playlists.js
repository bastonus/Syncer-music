const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../database/init');
const { getValidConnections } = require('../services/syncService');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token d\'authentification requis' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Récupérer toutes les playlists de l'utilisateur
router.get('/', authenticateToken, async (req, res) => {
  try {
    const playlists = await db.all(`
      SELECT 
        p.*,
        COUNT(pt.id) as track_count
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [req.user.userId]);

    // Récupérer les playlists des plateformes pour chaque playlist
    for (const playlist of playlists) {
      const platformPlaylists = await db.all(`
        SELECT platform, platform_playlist_id, platform_playlist_name, last_synced_at
        FROM platform_playlists 
        WHERE playlist_id = ?
      `, [playlist.id]);
      
      playlist.platforms = platformPlaylists;
    }

    res.json(playlists);
  } catch (error) {
    logger.error('Erreur lors de la récupération des playlists:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des playlists' });
  }
});

// Récupérer une playlist spécifique
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const playlist = await db.get(`
      SELECT * FROM playlists 
      WHERE id = ? AND user_id = ?
    `, [req.params.id, req.user.userId]);

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist non trouvée' });
    }

    // Récupérer les pistes
    const tracks = await db.all(`
      SELECT 
        t.*,
        pt.position,
        pt.added_at
      FROM tracks t
      JOIN playlist_tracks pt ON t.id = pt.track_id
      WHERE pt.playlist_id = ?
      ORDER BY pt.position
    `, [playlist.id]);

    // Récupérer les playlists des plateformes
    const platformPlaylists = await db.all(`
      SELECT platform, platform_playlist_id, platform_playlist_name, last_synced_at
      FROM platform_playlists 
      WHERE playlist_id = ?
    `, [playlist.id]);

    playlist.tracks = tracks;
    playlist.platforms = platformPlaylists;

    res.json(playlist);
  } catch (error) {
    logger.error('Erreur lors de la récupération de la playlist:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la playlist' });
  }
});

// Créer une nouvelle playlist
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Le nom de la playlist est requis' });
    }

    const result = await db.run(`
      INSERT INTO playlists (user_id, name, description)
      VALUES (?, ?, ?)
    `, [req.user.userId, name, description || '']);

    const playlist = await db.get(`
      SELECT * FROM playlists WHERE id = ?
    `, [result.lastID]);

    res.status(201).json(playlist);
  } catch (error) {
    logger.error('Erreur lors de la création de la playlist:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la playlist' });
  }
});

// Mettre à jour une playlist
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, sync_enabled } = req.body;
    const playlistId = req.params.id;

    // Vérifier que la playlist appartient à l'utilisateur
    const playlist = await db.get(`
      SELECT * FROM playlists 
      WHERE id = ? AND user_id = ?
    `, [playlistId, req.user.userId]);

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist non trouvée' });
    }

    await db.run(`
      UPDATE playlists 
      SET name = COALESCE(?, name), 
          description = COALESCE(?, description),
          sync_enabled = COALESCE(?, sync_enabled),
          updated_at = datetime('now')
      WHERE id = ?
    `, [name, description, sync_enabled, playlistId]);

    const updatedPlaylist = await db.get(`
      SELECT * FROM playlists WHERE id = ?
    `, [playlistId]);

    res.json(updatedPlaylist);
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la playlist:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la playlist' });
  }
});

// Supprimer une playlist
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const playlistId = req.params.id;

    // Vérifier que la playlist appartient à l'utilisateur
    const playlist = await db.get(`
      SELECT * FROM playlists 
      WHERE id = ? AND user_id = ?
    `, [playlistId, req.user.userId]);

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist non trouvée' });
    }

    // Supprimer les références dans les tables liées
    await db.run('DELETE FROM playlist_tracks WHERE playlist_id = ?', [playlistId]);
    await db.run('DELETE FROM platform_playlists WHERE playlist_id = ?', [playlistId]);
    await db.run('DELETE FROM sync_logs WHERE playlist_id = ?', [playlistId]);
    await db.run('DELETE FROM playlists WHERE id = ?', [playlistId]);

    res.json({ message: 'Playlist supprimée avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression de la playlist:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la playlist' });
  }
});

// Importer une playlist depuis une plateforme
router.post('/import', authenticateToken, async (req, res) => {
  try {
    const { platform, platformPlaylistId, name, description } = req.body;

    if (!platform || !platformPlaylistId) {
      return res.status(400).json({ message: 'Plateforme et ID de playlist requis' });
    }

    // Vérifier la connexion à la plateforme
    const connections = await getValidConnections(req.user.userId);
    const connection = connections.find(c => c.platform === platform);

    if (!connection) {
      return res.status(400).json({ message: `Pas de connexion valide à ${platform}` });
    }

    // Créer la playlist locale
    const playlistResult = await db.run(`
      INSERT INTO playlists (user_id, name, description)
      VALUES (?, ?, ?)
    `, [req.user.userId, name, description || '']);

    const playlistId = playlistResult.lastID;

    // Lier à la playlist de la plateforme
    await db.run(`
      INSERT INTO platform_playlists 
      (playlist_id, platform, platform_playlist_id, platform_playlist_name)
      VALUES (?, ?, ?, ?)
    `, [playlistId, platform, platformPlaylistId, name]);

    // Récupérer et sauvegarder les pistes
    const platformServices = {
      spotify: require('../services/platforms/spotify'),
      deezer: require('../services/platforms/deezer'),
      youtube: require('../services/platforms/youtubeMusic')
    };

    const service = platformServices[platform];
    if (service) {
      const tracks = await service.getPlaylistTracks(connection.access_token, platformPlaylistId);
      
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        
        // Insérer ou récupérer la piste
        let trackResult = await db.get(`
          SELECT id FROM tracks 
          WHERE title = ? AND artist = ?
        `, [track.title, track.artist]);

        if (!trackResult) {
          const insertResult = await db.run(`
            INSERT INTO tracks (title, artist, album, duration, isrc)
            VALUES (?, ?, ?, ?, ?)
          `, [track.title, track.artist, track.album, track.duration, track.isrc]);
          
          trackResult = { id: insertResult.lastID };
        }

        // Lier la piste à la playlist
        await db.run(`
          INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position)
          VALUES (?, ?, ?)
        `, [playlistId, trackResult.id, i + 1]);

        // Sauvegarder l'ID de la piste sur la plateforme
        await db.run(`
          INSERT OR IGNORE INTO platform_tracks 
          (track_id, platform, platform_track_id, platform_track_uri)
          VALUES (?, ?, ?, ?)
        `, [trackResult.id, platform, track.id, track.uri]);
      }
    }

    const playlist = await db.get(`
      SELECT * FROM playlists WHERE id = ?
    `, [playlistId]);

    res.status(201).json({
      message: 'Playlist importée avec succès',
      playlist
    });
  } catch (error) {
    logger.error('Erreur lors de l\'importation de la playlist:', error);
    res.status(500).json({ message: 'Erreur lors de l\'importation de la playlist' });
  }
});

// Récupérer les playlists disponibles sur les plateformes
router.get('/external/:platform', authenticateToken, async (req, res) => {
  try {
    const { platform } = req.params;

    // Vérifier la connexion à la plateforme
    const connections = await getValidConnections(req.user.userId);
    const connection = connections.find(c => c.platform === platform);

    if (!connection) {
      return res.status(400).json({ message: `Pas de connexion valide à ${platform}` });
    }

    const platformServices = {
      spotify: require('../services/platforms/spotify'),
      deezer: require('../services/platforms/deezer'),
      youtube: require('../services/platforms/youtubeMusic')
    };

    const service = platformServices[platform];
    if (!service) {
      return res.status(400).json({ message: 'Plateforme non supportée' });
    }

    const playlists = await service.getPlaylists(connection.access_token);
    
    res.json(playlists);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des playlists ${req.params.platform}:`, error);
    res.status(500).json({ message: 'Erreur lors de la récupération des playlists' });
  }
});

module.exports = router; 