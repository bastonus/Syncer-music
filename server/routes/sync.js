const express = require('express');
const jwt = require('jsonwebtoken');
const { syncPlaylistNow, getSyncStatus, getSyncStats } = require('../services/syncScheduler');
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

// Synchroniser une playlist manuellement
router.post('/playlist/:id', authenticateToken, async (req, res) => {
  try {
    const playlistId = req.params.id;
    const result = await syncPlaylistNow(req.user.userId, playlistId);
    
    res.json({
      message: 'Synchronisation lancée avec succès',
      result
    });
  } catch (error) {
    logger.error('Erreur lors du lancement de la synchronisation:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la synchronisation',
      error: error.message 
    });
  }
});

// Obtenir le statut de synchronisation
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const playlistId = req.query.playlistId;
    const logs = await getSyncStatus(req.user.userId, playlistId);
    
    res.json(logs);
  } catch (error) {
    logger.error('Erreur lors de la récupération du statut:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du statut' });
  }
});

// Obtenir les statistiques de synchronisation
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getSyncStats(req.user.userId);
    
    res.json(stats);
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

module.exports = router; 