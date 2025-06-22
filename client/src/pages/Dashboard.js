import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import {
  Sync as SyncIcon,
  CloudDone,
  CloudOff,
  Refresh,
  Add as AddIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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

export default function Dashboard() {
  const { user } = useAuth();
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  const { data: connections, refetch: refetchConnections } = useQuery(
    'connections',
    () => api.get('/auth/connections').then(res => res.data.connections)
  );

  const { data: playlists, refetch: refetchPlaylists } = useQuery(
    'playlists',
    () => api.get('/playlists').then(res => res.data)
  );

  const { data: syncStats } = useQuery(
    'syncStats',
    () => api.get('/sync/stats').then(res => res.data),
    { refetchInterval: 30000 }
  );

  const { data: syncLogs } = useQuery(
    'syncLogs',
    () => api.get('/sync/status').then(res => res.data),
    { refetchInterval: 10000 }
  );

  const handleConnectPlatform = (platform) => {
    window.location.href = `/api/auth/${platform}?userId=${user.id}`;
  };

  const handleSyncAll = async () => {
    try {
      const syncPromises = playlists
        ?.filter(p => p.sync_enabled)
        ?.map(playlist => 
          api.post(`/sync/playlist/${playlist.id}`)
        ) || [];

      await Promise.all(syncPromises);
      toast.success('Synchronisation lancée pour toutes les playlists');
      setSyncDialogOpen(false);
    } catch (error) {
      toast.error('Erreur lors du lancement de la synchronisation');
    }
  };

  const connectedPlatforms = connections?.map(c => c.platform) || [];
  const totalPlaylists = playlists?.length || 0;
  const activePlaylists = playlists?.filter(p => p.sync_enabled)?.length || 0;

  return (
    <Box>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" gutterBottom>
          Tableau de bord
        </Typography>
        
        {connectedPlatforms.length < 2 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Connectez au moins 2 plateformes pour commencer la synchronisation
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Statistiques */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Playlists
                </Typography>
                <Typography variant="h3" color="primary">
                  {totalPlaylists}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activePlaylists} avec synchronisation activée
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Synchronisations
                </Typography>
                <Typography variant="h3" color="secondary">
                  {syncStats?.overall?.total_syncs || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {syncStats?.overall?.successful_syncs || 0} réussies
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Plateformes
                </Typography>
                <Typography variant="h3" color="info.main">
                  {connectedPlatforms.length}/3
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  connectées
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Connexions aux plateformes */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Connexions aux plateformes
                </Typography>
                <Grid container spacing={2}>
                  {['spotify', 'deezer', 'youtube'].map(platform => {
                    const isConnected = connectedPlatforms.includes(platform);
                    return (
                      <Grid item xs={12} sm={4} key={platform}>
                        <Card 
                          variant="outlined"
                          sx={{ 
                            borderColor: isConnected ? platformColors[platform] : 'grey.300',
                            bgcolor: isConnected ? `${platformColors[platform]}10` : 'background.paper'
                          }}
                        >
                          <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                              {isConnected ? <CloudDone color="success" /> : <CloudOff color="disabled" />}
                              <Typography variant="h6">
                                {platformNames[platform]}
                              </Typography>
                            </Box>
                            {isConnected ? (
                              <Chip 
                                label="Connecté" 
                                color="success" 
                                size="small"
                                sx={{ mt: 1 }}
                              />
                            ) : (
                              <Button 
                                variant="outlined" 
                                size="small"
                                sx={{ mt: 1 }}
                                onClick={() => handleConnectPlatform(platform)}
                              >
                                Connecter
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Activité récente */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Activité récente
                </Typography>
                {syncLogs && syncLogs.length > 0 ? (
                  <List>
                    {syncLogs.slice(0, 5).map((log, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={`${log.action} - ${log.playlist_name || 'Toutes les playlists'}`}
                          secondary={`${log.platform} • ${new Date(log.created_at).toLocaleString()}`}
                        />
                        <ListItemSecondaryAction>
                          <Chip 
                            label={log.status} 
                            color={log.status === 'success' ? 'success' : 'error'}
                            size="small"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary">
                    Aucune activité récente
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Bouton de synchronisation */}
        {connectedPlatforms.length >= 2 && activePlaylists > 0 && (
          <Fab
            color="primary"
            aria-label="sync"
            sx={{
              position: 'fixed',
              bottom: 32,
              right: 32,
            }}
            onClick={() => setSyncDialogOpen(true)}
          >
            <SyncIcon />
          </Fab>
        )}

        {/* Dialog de synchronisation */}
        <Dialog open={syncDialogOpen} onClose={() => setSyncDialogOpen(false)}>
          <DialogTitle>Synchroniser toutes les playlists</DialogTitle>
          <DialogContent>
            <Typography gutterBottom>
              Cela va synchroniser toutes vos playlists actives entre les plateformes connectées.
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button onClick={() => setSyncDialogOpen(false)}>
                Annuler
              </Button>
              <Button variant="contained" onClick={handleSyncAll}>
                Synchroniser
              </Button>
            </Box>
          </DialogContent>
        </Dialog>
      </motion.div>
    </Box>
  );
} 