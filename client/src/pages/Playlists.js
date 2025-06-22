import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Fab,
} from '@mui/material';
import {
  PlaylistPlay,
  Sync as SyncIcon,
  Add as AddIcon,
  CloudDownload,
  Settings,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const platformColors = {
  spotify: '#1DB954',
  deezer: '#FF6B00',
  youtube: '#FF0000',
};

export default function Playlists() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: playlists, isLoading } = useQuery(
    'playlists',
    () => api.get('/playlists').then(res => res.data)
  );

  const { data: connections } = useQuery(
    'connections',
    () => api.get('/auth/connections').then(res => res.data.connections)
  );

  const { data: externalPlaylists } = useQuery(
    ['externalPlaylists', selectedPlatform],
    () => selectedPlatform ? api.get(`/playlists/external/${selectedPlatform}`).then(res => res.data) : Promise.resolve([]),
    { enabled: !!selectedPlatform }
  );

  const createPlaylistMutation = useMutation(
    (data) => api.post('/playlists', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('playlists');
        toast.success('Playlist créée avec succès');
        setCreateDialogOpen(false);
        setNewPlaylistName('');
        setNewPlaylistDescription('');
      },
      onError: () => {
        toast.error('Erreur lors de la création de la playlist');
      },
    }
  );

  const importPlaylistMutation = useMutation(
    (data) => api.post('/playlists/import', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('playlists');
        toast.success('Playlist importée avec succès');
        setImportDialogOpen(false);
      },
      onError: () => {
        toast.error('Erreur lors de l\'importation de la playlist');
      },
    }
  );

  const toggleSyncMutation = useMutation(
    ({ id, sync_enabled }) => api.put(`/playlists/${id}`, { sync_enabled }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('playlists');
        toast.success('Paramètres de synchronisation mis à jour');
      },
      onError: () => {
        toast.error('Erreur lors de la mise à jour');
      },
    }
  );

  const syncPlaylistMutation = useMutation(
    (id) => api.post(`/sync/playlist/${id}`),
    {
      onSuccess: () => {
        toast.success('Synchronisation lancée');
      },
      onError: () => {
        toast.error('Erreur lors du lancement de la synchronisation');
      },
    }
  );

  const handleCreatePlaylist = () => {
    createPlaylistMutation.mutate({
      name: newPlaylistName,
      description: newPlaylistDescription,
    });
  };

  const handleImportPlaylist = (externalPlaylist) => {
    importPlaylistMutation.mutate({
      platform: selectedPlatform,
      platformPlaylistId: externalPlaylist.id,
      name: externalPlaylist.name,
      description: externalPlaylist.description || '',
    });
  };

  const handleToggleSync = (playlist) => {
    toggleSyncMutation.mutate({
      id: playlist.id,
      sync_enabled: !playlist.sync_enabled,
    });
  };

  const handleSyncPlaylist = (playlistId) => {
    syncPlaylistMutation.mutate(playlistId);
  };

  const connectedPlatforms = connections?.map(c => c.platform) || [];

  if (isLoading) {
    return <Typography>Chargement...</Typography>;
  }

  return (
    <Box>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">
            Mes Playlists
          </Typography>
          <Button
            variant="outlined"
            startIcon={<CloudDownload />}
            onClick={() => setImportDialogOpen(true)}
            disabled={connectedPlatforms.length === 0}
          >
            Importer
          </Button>
        </Box>

        <Grid container spacing={3}>
          {playlists?.map((playlist) => (
            <Grid item xs={12} sm={6} md={4} key={playlist.id}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <PlaylistPlay color="primary" />
                      <Typography variant="h6" noWrap>
                        {playlist.name}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {playlist.description || 'Aucune description'}
                    </Typography>

                    <Typography variant="body2" mb={2}>
                      {playlist.track_count || 0} pistes
                    </Typography>

                    <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                      {playlist.platforms?.map((platform) => (
                        <Chip
                          key={platform.platform}
                          label={platform.platform}
                          size="small"
                          sx={{
                            bgcolor: platformColors[platform.platform],
                            color: 'white',
                          }}
                        />
                      ))}
                    </Box>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={playlist.sync_enabled}
                          onChange={() => handleToggleSync(playlist)}
                        />
                      }
                      label="Synchronisation"
                    />
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => navigate(`/playlists/${playlist.id}`)}
                    >
                      Détails
                    </Button>
                    <Button
                      size="small"
                      startIcon={<SyncIcon />}
                      onClick={() => handleSyncPlaylist(playlist.id)}
                      disabled={!playlist.sync_enabled}
                    >
                      Synchroniser
                    </Button>
                  </CardActions>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {(!playlists || playlists.length === 0) && (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="text.secondary" mb={2}>
              Aucune playlist trouvée
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Créez votre première playlist ou importez-en une depuis vos plateformes connectées
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Créer une playlist
            </Button>
          </Box>
        )}

        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
          }}
          onClick={() => setCreateDialogOpen(true)}
        >
          <AddIcon />
        </Fab>

        {/* Dialog de création */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Créer une nouvelle playlist</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Nom de la playlist"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={newPlaylistDescription}
              onChange={(e) => setNewPlaylistDescription(e.target.value)}
              margin="normal"
              multiline
              rows={3}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreatePlaylist}
              variant="contained"
              disabled={!newPlaylistName.trim() || createPlaylistMutation.isLoading}
            >
              Créer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog d'importation */}
        <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Importer une playlist</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Sélectionnez d'abord une plateforme, puis choisissez la playlist à importer
            </Typography>
            
            <Box display="flex" gap={2} mb={3}>
              {connectedPlatforms.map((platform) => (
                <Button
                  key={platform}
                  variant={selectedPlatform === platform ? 'contained' : 'outlined'}
                  onClick={() => setSelectedPlatform(platform)}
                  sx={{
                    bgcolor: selectedPlatform === platform ? platformColors[platform] : 'transparent',
                    borderColor: platformColors[platform],
                    color: selectedPlatform === platform ? 'white' : platformColors[platform],
                  }}
                >
                  {platform}
                </Button>
              ))}
            </Box>

            {selectedPlatform && (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {externalPlaylists?.map((playlist) => (
                  <ListItem key={playlist.id}>
                    <ListItemText
                      primary={playlist.name}
                      secondary={`${playlist.trackCount || 0} pistes${playlist.description ? ` • ${playlist.description}` : ''}`}
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleImportPlaylist(playlist)}
                        disabled={importPlaylistMutation.isLoading}
                      >
                        Importer
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setImportDialogOpen(false)}>
              Fermer
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Box>
  );
} 