const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/init');
const logger = require('../utils/logger');

const router = express.Router();

// Inscription
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà' });
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const result = await db.run(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email, passwordHash]
    );

    // Générer le token JWT
    const token = jwt.sign(
      { userId: result.lastID, email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: { id: result.lastID, email }
    });
  } catch (error) {
    logger.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ message: 'Erreur lors de l\'inscription' });
  }
});

// Connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    // Trouver l'utilisateur
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    logger.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur lors de la connexion' });
  }
});

// Authentification Spotify
router.get('/spotify', (req, res) => {
  const scopes = 'playlist-read-private playlist-modify-private playlist-modify-public user-read-email';
  const authURL = `https://accounts.spotify.com/authorize?` +
    `client_id=${process.env.SPOTIFY_CLIENT_ID}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI)}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `state=${req.query.userId}`;
  
  res.redirect(authURL);
});

// Callback Spotify
router.get('/spotify/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code) {
      return res.status(400).json({ message: 'Code d\'autorisation manquant' });
    }

    // Échanger le code contre un token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || 'Erreur lors de l\'obtention du token');
    }

    // Obtenir les infos utilisateur
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const userData = await userResponse.json();

    // Sauvegarder la connexion
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    
    await db.run(`
      INSERT OR REPLACE INTO platform_connections 
      (user_id, platform, platform_user_id, access_token, refresh_token, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, 'spotify', userData.id, tokenData.access_token, tokenData.refresh_token, expiresAt]);

    res.redirect(`${process.env.CLIENT_URL}/dashboard?connected=spotify`);
  } catch (error) {
    logger.error('Erreur callback Spotify:', error);
    res.redirect(`${process.env.CLIENT_URL}/dashboard?error=spotify_auth`);
  }
});

// Authentification Deezer
router.get('/deezer', (req, res) => {
  const authURL = `https://connect.deezer.com/oauth/auth.php?` +
    `app_id=${process.env.DEEZER_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.DEEZER_REDIRECT_URI)}&` +
    `perms=basic_access,email,offline_access,manage_library,delete_library&` +
    `state=${req.query.userId}`;
  
  res.redirect(authURL);
});

// Callback Deezer
router.get('/deezer/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code) {
      return res.status(400).json({ message: 'Code d\'autorisation manquant' });
    }

    // Échanger le code contre un token
    const tokenResponse = await fetch('https://connect.deezer.com/oauth/access_token.php', {
      method: 'POST',
      body: new URLSearchParams({
        app_id: process.env.DEEZER_CLIENT_ID,
        secret: process.env.DEEZER_CLIENT_SECRET,
        code,
        redirect_uri: process.env.DEEZER_REDIRECT_URI
      })
    });

    const tokenText = await tokenResponse.text();
    const tokenParams = new URLSearchParams(tokenText);
    const accessToken = tokenParams.get('access_token');
    const expiresIn = tokenParams.get('expires_in');

    if (!accessToken) {
      throw new Error('Token d\'accès non reçu');
    }

    // Obtenir les infos utilisateur
    const userResponse = await fetch(`https://api.deezer.com/user/me?access_token=${accessToken}`);
    const userData = await userResponse.json();

    // Sauvegarder la connexion
    const expiresAt = new Date(Date.now() + parseInt(expiresIn) * 1000);
    
    await db.run(`
      INSERT OR REPLACE INTO platform_connections 
      (user_id, platform, platform_user_id, access_token, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, 'deezer', userData.id.toString(), accessToken, expiresAt]);

    res.redirect(`${process.env.CLIENT_URL}/dashboard?connected=deezer`);
  } catch (error) {
    logger.error('Erreur callback Deezer:', error);
    res.redirect(`${process.env.CLIENT_URL}/dashboard?error=deezer_auth`);
  }
});

// Authentification YouTube Music
router.get('/youtube', (req, res) => {
  const scopes = 'https://www.googleapis.com/auth/youtube';
  const authURL = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.YOUTUBE_CLIENT_ID}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(process.env.YOUTUBE_REDIRECT_URI)}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${req.query.userId}`;
  
  res.redirect(authURL);
});

// Callback YouTube Music
router.get('/youtube/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code) {
      return res.status(400).json({ message: 'Code d\'autorisation manquant' });
    }

    // Échanger le code contre un token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        redirect_uri: process.env.YOUTUBE_REDIRECT_URI
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || 'Erreur lors de l\'obtention du token');
    }

    // Obtenir les infos utilisateur
    const userResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const userData = await userResponse.json();

    let channelId = 'default';
    if (userData.items && userData.items.length > 0) {
      channelId = userData.items[0].id;
    }

    // Sauvegarder la connexion
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    
    await db.run(`
      INSERT OR REPLACE INTO platform_connections 
      (user_id, platform, platform_user_id, access_token, refresh_token, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, 'youtube', channelId, tokenData.access_token, tokenData.refresh_token, expiresAt]);

    res.redirect(`${process.env.CLIENT_URL}/dashboard?connected=youtube`);
  } catch (error) {
    logger.error('Erreur callback YouTube Music:', error);
    res.redirect(`${process.env.CLIENT_URL}/dashboard?error=youtube_auth`);
  }
});

// Déconnexion d'une plateforme
router.delete('/disconnect/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'Token d\'authentification requis' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    await db.run('DELETE FROM platform_connections WHERE user_id = ? AND platform = ?', 
      [decoded.userId, platform]);

    res.json({ message: `Déconnexion de ${platform} réussie` });
  } catch (error) {
    logger.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({ message: 'Erreur lors de la déconnexion' });
  }
});

// Obtenir les connexions de l'utilisateur
router.get('/connections', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'Token d\'authentification requis' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    const connections = await db.all(`
      SELECT platform, platform_user_id, created_at, expires_at
      FROM platform_connections 
      WHERE user_id = ?
    `, [decoded.userId]);

    res.json({ connections });
  } catch (error) {
    logger.error('Erreur lors de la récupération des connexions:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des connexions' });
  }
});

module.exports = router; 