import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
  Sync as SyncIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import api from '../services/api';

const platformColors = {
  spotify: '#1DB954',
  deezer: '#FF6B00',
  youtube: '#FF0000',
};

const platformNames = {
  spotify: 'Spotify',
  deezer: 'Deezer',
  youtube: 'YouTube Music',
};

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const { data: playlist, isLoading } = useQuery(
    ['playlist', id],
    () => api.get(`/playlists/${id}`).then(res => res.data)
  );

  const { data: syncLogs } = useQuery(
    ['syncLogs', id],
    () => api.get(`/sync/status?playlistId=${id}`).then(res => res.data),
    { refetchInterval: 10000 }
  );

  const updatePlaylistMutation = useMutation(
    (data) => api.put(`/playlists/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['playlist', id]);
        queryClient.invalidateQueries('playlists');
        toast.success('Playlist mise à jour');
        setEditDialogOpen(false);
      },
      onError: () => {
        toast.error('Erreur lors de la mise à jour');
      },
    }
  );

  const deletePlaylistMutation = useMutation(
    () => api.delete(`/playlists/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('playlists');
        toast.success('Playlist supprimée');
        navigate('/playlists');
      },
      onError: () => {
        toast.error('Erreur lors de la suppression');
      },
    }
  );

  const syncPlaylistMutation = useMutation(
    () => api.post(`/sync/playlist/${id}`),
    {
      onSuccess: () => {
        toast.success('Synchronisation lancée');
      },
      onError: () => {
        toast.error('Erreur lors du lancement de la synchronisation');
      },
    }
  );

  const handleEdit = () => {
    setEditName(playlist.name);
    setEditDescription(playlist.description || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    updatePlaylistMutation.mutate({
      name: editName,
      description: editDescription,
    });
  };

  const handleToggleSync = () => {
    updatePlaylistMutation.mutate({
      sync_enabled: !playlist.sync_enabled,
    });
  };

  const handleDelete = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette playlist ?')) {
      deletePlaylistMutation.mutate();
    }
  };

  const handleSync = () => {
    syncPlaylistMutation.mutate();
  };

  if (isLoading) {
    return <Typography>Chargement...</Typography>;
  }

  if (!playlist) {
    return <Typography>Playlist non trouvée</Typography>;
  }

  return (
    <Box>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <IconButton onClick={() => navigate('/playlists')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4">
            {playlist.name}
          </Typography>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justify="space-between" alignItems="start" mb={2}>
              <Box>
                <Typography variant="h5" gutterBottom>
                  {playlist.name}
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  {playlist.description || 'Aucune description'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {playlist.tracks?.length || 0} pistes
                </Typography>
              </Box>
              <Box display="flex" gap={1}>
                <IconButton onClick={handleEdit}>
                  <EditIcon />
                </IconButton>
                <IconButton onClick={handleDelete} color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>

            <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
              {playlist.platforms?.map((platform) => (
                <Chip
                  key={platform.platform}
                  label={`${platformNames[platform.platform]} (${platform.platform_playlist_name})`}
                  sx={{
                    bgcolor: platformColors[platform.platform],
                    color: 'white',
                  }}
                />
              ))}
            </Box>

            <Box display="flex" gap={2} alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={playlist.sync_enabled}
                    onChange={handleToggleSync}
                  />
                }
                label="Synchronisation automatique"
              />
              <Button
                variant="contained"
                startIcon={<SyncIcon />}
                onClick={handleSync}
                disabled={!playlist.sync_enabled || syncPlaylistMutation.isLoading}
              >
                Synchroniser maintenant
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Liste des pistes */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pistes ({playlist.tracks?.length || 0})
            </Typography>
            {playlist.tracks && playlist.tracks.length > 0 ? (
              <List>
                {playlist.tracks.map((track, index) => (
                  <ListItem key={track.id}>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <PlayArrow color="action" fontSize="small" />
                          <Typography variant="subtitle1">
                            {track.title}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {track.artist}
                          </Typography>
                          {track.album && (
                            <Typography variant="body2" color="text.secondary">
                              Album: {track.album}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">
                Aucune piste dans cette playlist
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Historique de synchronisation */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Historique de synchronisation
            </Typography>
            {syncLogs && syncLogs.length > 0 ? (
              <List>
                {syncLogs.slice(0, 10).map((log, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={`${log.action} - ${log.platform}`}
                      secondary={new Date(log.created_at).toLocaleString()}
                    />
                    <Chip
                      label={log.status}
                      color={log.status === 'success' ? 'success' : 'error'}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">
                Aucun historique de synchronisation
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Dialog d'édition */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Modifier la playlist</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Nom de la playlist"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              margin="normal"
              multiline
              rows={3}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveEdit}
              variant="contained"
              disabled={!editName.trim() || updatePlaylistMutation.isLoading}
            >
              Sauvegarder
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Box>
  );
} 