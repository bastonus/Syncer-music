# 🎵 Syncer Music

Application complète de synchronisation de playlists entre **Spotify**, **Deezer** et **YouTube Music**.

## ✨ Fonctionnalités

- 🔄 **Synchronisation automatique** : Vos playlists se synchronisent toutes les 30 minutes
- 🎯 **Synchronisation manuelle** : Lancez une synchronisation à la demande
- 🔗 **Multi-plateformes** : Support complet de Spotify, Deezer et YouTube Music
- 📊 **Tableau de bord** : Statistiques et statut de synchronisation en temps réel
- 🎨 **Interface moderne** : UI sombre et responsive avec Material-UI
- 🔐 **Sécurisé** : Authentification JWT et tokens OAuth sécurisés
- 📱 **Responsive** : Fonctionne parfaitement sur mobile et desktop

## 🏗️ Architecture

### Backend (Node.js/Express)
- **Base de données** : SQLite avec schéma complet
- **API REST** : Routes pour auth, playlists, synchronisation
- **Services** : Intégrations complètes avec les APIs des plateformes
- **Planificateur** : Synchronisation automatique en arrière-plan
- **Logs** : Système de logging complet avec Winston

### Frontend (React)
- **React 18** avec hooks modernes
- **Material-UI** pour l'interface utilisateur
- **React Router** pour la navigation
- **React Query** pour la gestion des données
- **Framer Motion** pour les animations

## 🚀 Installation

### Prérequis
- Node.js 16+ et npm
- Comptes développeur sur Spotify, Deezer et YouTube

### 1. Cloner et installer les dépendances

```bash
git clone <votre-repo>
cd syncer-music
npm run install:all
```

### 2. Configuration des APIs

#### Spotify
1. Allez sur https://developer.spotify.com/dashboard
2. Créez une nouvelle app
3. Notez le Client ID et Client Secret
4. Ajoutez `http://localhost:5000/api/auth/spotify/callback` aux URIs de redirection

#### Deezer
1. Allez sur https://developers.deezer.com/myapps
2. Créez une nouvelle application
3. Notez l'Application ID et Secret Key
4. Configurez l'URI de redirection : `http://localhost:5000/api/auth/deezer/callback`

#### YouTube Music (Google)
1. Allez sur https://console.developers.google.com
2. Créez un nouveau projet et activez l'API YouTube Data v3
3. Créez des identifiants OAuth 2.0
4. Ajoutez `http://localhost:5000/api/auth/youtube/callback` aux URIs autorisées

### 3. Configuration des variables d'environnement

Copiez `.env.example` vers `.env` et remplissez vos clés :

```bash
cp .env.example .env
```

Éditez `.env` :
```env
# Spotify
SPOTIFY_CLIENT_ID=votre_spotify_client_id
SPOTIFY_CLIENT_SECRET=votre_spotify_client_secret

# Deezer
DEEZER_CLIENT_ID=votre_deezer_app_id
DEEZER_CLIENT_SECRET=votre_deezer_secret

# YouTube
YOUTUBE_CLIENT_ID=votre_google_client_id
YOUTUBE_CLIENT_SECRET=votre_google_client_secret

# JWT
JWT_SECRET=votre_secret_jwt_super_securise
```

### 4. Démarrage

```bash
# Mode développement (lance le serveur et le client)
npm run dev

# Ou séparément :
npm run server:dev  # Serveur sur :5000
npm run client:dev  # Client sur :3000
```

## 📱 Utilisation

1. **Inscription/Connexion** : Créez votre compte
2. **Connexion aux plateformes** : Connectez vos comptes Spotify, Deezer et/ou YouTube Music
3. **Import de playlists** : Importez vos playlists existantes
4. **Synchronisation** : Activez la synchronisation automatique ou manuelle

## 🔧 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/spotify` - Auth Spotify
- `GET /api/auth/deezer` - Auth Deezer
- `GET /api/auth/youtube` - Auth YouTube Music

### Playlists
- `GET /api/playlists` - Liste des playlists
- `POST /api/playlists` - Créer une playlist
- `GET /api/playlists/:id` - Détails d'une playlist
- `POST /api/playlists/import` - Importer une playlist

### Synchronisation
- `POST /api/sync/playlist/:id` - Synchroniser une playlist
- `GET /api/sync/status` - Statut des synchronisations
- `GET /api/sync/stats` - Statistiques

## 📊 Base de données

Structure complète avec :
- **users** : Comptes utilisateurs
- **platform_connections** : Tokens OAuth
- **playlists** : Playlists locales
- **platform_playlists** : Liens vers les plateformes
- **tracks** : Pistes musicales
- **sync_logs** : Historique des synchronisations

## 🔄 Synchronisation

### Automatique
- Toutes les 30 minutes pour les playlists actives
- Gestion intelligente des limites de taux
- Retry automatique en cas d'erreur

### Manuelle
- Synchronisation à la demande
- Feedback en temps réel
- Logs détaillés

## 🛡️ Sécurité

- Tokens JWT pour l'authentification
- Tokens OAuth stockés de manière sécurisée
- Rate limiting sur les APIs
- Validation des données entrantes
- Helmet.js pour la sécurité HTTP

## 🚀 Déploiement

### Production
```bash
npm run build
npm start
```

### Variables d'environnement production
```env
NODE_ENV=production
CLIENT_URL=https://votre-domaine.com
# ... autres variables
```

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

MIT License - voir le fichier [LICENSE] pour plus de détails.

## 🆘 Support

- 📧 Email : support@syncermusic.com
- 🐛 Issues : GitHub Issues
- 📖 Documentation : Wiki du repo

## 🎯 Roadmap

- [ ] Support d'Apple Music
- [ ] Synchronisation des podcasts
- [ ] Application mobile
- [ ] API publique
- [ ] Intégration Last.fm

---

**Développé avec ❤️ pour les amateurs de musique** 