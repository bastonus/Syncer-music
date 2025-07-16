# Guide de Déploiement Vercel - Syncer Music

## 📋 Prérequis

1. **Compte Vercel** avec accès à votre repository GitHub
2. **Comptes développeur** pour les services musicaux :
   - Spotify Developer Account
   - Deezer Developer Account  
   - Google Cloud Console (pour YouTube)

## 🚀 Étapes de Déploiement

### 1. Connexion GitHub → Vercel

1. Allez sur [vercel.com](https://vercel.com) et connectez-vous
2. Cliquez sur "New Project"
3. Importez votre repository GitHub
4. Vercel détectera automatiquement la configuration

### 2. Configuration des Variables d'Environnement

Dans le dashboard Vercel, allez dans **Settings > Environment Variables** et ajoutez :

```bash
# Configuration générale
FRONTEND_URL=https://your-project-name.vercel.app

# Spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://your-project-name.vercel.app/api/spotify-callback

# Deezer
DEEZER_APP_ID=your_deezer_app_id
DEEZER_SECRET_KEY=your_deezer_secret_key
DEEZER_REDIRECT_URI=https://your-project-name.vercel.app/api/deezer-callback

# Google/YouTube
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-project-name.vercel.app/api/google-callback
```

### 3. Configuration des Applications

#### Spotify
1. Allez sur [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Créez une nouvelle application
3. Ajoutez `https://your-project-name.vercel.app/api/spotify-callback` aux Redirect URIs

#### Deezer
1. Allez sur [Deezer Developers](https://developers.deezer.com)
2. Créez une nouvelle application
3. Configurez `https://your-project-name.vercel.app/api/deezer-callback` comme redirect URI

#### Google/YouTube
1. Allez sur [Google Cloud Console](https://console.cloud.google.com)
2. Créez un projet et activez l'API YouTube
3. Créez des credentials OAuth 2.0
4. Ajoutez `https://your-project-name.vercel.app/api/google-callback` aux URIs autorisés

### 4. Déploiement

1. Poussez votre code vers GitHub
2. Vercel déploiera automatiquement
3. Le build utilisera le fichier `vercel.json` pour la configuration

## 🔧 Structure des Fonctions API

Les fonctions serverless sont organisées dans `server/api/` :

```
server/api/
├── auth-status.js          # GET /api/auth-status
├── spotify-auth.js         # GET /api/spotify-auth
├── spotify-callback.js     # GET /api/spotify-callback
├── deezer-auth.js         # GET /api/deezer-auth
├── deezer-callback.js     # GET /api/deezer-callback
├── google-auth.js         # GET /api/google-auth
├── google-callback.js     # GET /api/google-callback
├── playlists.js           # GET /api/playlists
├── playlist-tracks.js     # GET /api/playlist-tracks
├── transfer.js            # POST /api/transfer
├── share-create.js        # POST /api/share-create
├── share-get.js           # GET /api/share-get
└── settings-save.js       # POST /api/settings-save
```

## 🔄 Synchronisation Automatique

- **Déploiement automatique** : Chaque push sur `main` déclenche un nouveau déploiement
- **Preview deployments** : Chaque pull request génère un aperçu
- **Rollback facile** : Retour à une version précédente en 1 clic

## 🐛 Dépannage

### Erreurs communes :

1. **Variables d'environnement manquantes** : Vérifiez que toutes les variables sont définies dans Vercel
2. **Redirect URIs incorrects** : Assurez-vous que les URIs correspondent exactement dans les applications
3. **Limites de timeout** : Les fonctions Vercel ont une limite de 30 secondes (configurée dans `vercel.json`)

### Logs :

- Consultez les logs dans le dashboard Vercel sous **Functions > View Function Logs**
- Utilisez `console.log()` pour déboguer vos fonctions

## 📝 Notes Importantes

- Les fonctions serverless sont **stateless** - pas de stockage local persistant
- Les tokens sont stockés dans des fichiers JSON (considérez une base de données pour la production)
- Le dossier `shares/` est créé dynamiquement lors du premier partage

## 🎯 Prochaines Étapes

1. Testez toutes les fonctionnalités après le déploiement
2. Configurez un domaine personnalisé si nécessaire
3. Activez les analytics Vercel pour surveiller les performances
4. Considérez l'ajout d'une base de données pour la persistance des données 