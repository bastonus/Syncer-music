import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import {
  CloudDone,
  CloudOff,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from 'react-query';
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

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: connections } = useQuery(
    'connections',
    () => api.get('/auth/connections').then(res => res.data.connections)
  );

  const disconnectMutation = useMutation(
    (platform) => api.delete(`/auth/disconnect/${platform}`),
    {
      onSuccess: (_, platform) => {
        queryClient.invalidateQueries('connections');
        toast.success(`Déconnexion de ${platformNames[platform]} réussie`);
      },
      onError: () => {
        toast.error('Erreur lors de la déconnexion');
      },
    }
  );

  const handleConnect = (platform) => {
    window.location.href = `/api/auth/${platform}?userId=${user.id}`;
  };

  const handleDisconnect = (platform) => {
    if (window.confirm(`Êtes-vous sûr de vouloir vous déconnecter de ${platformNames[platform]} ?`)) {
      disconnectMutation.mutate(platform);
    }
  };

  const connectedPlatforms = connections?.map(c => c.platform) || [];

  return (
    <Box>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" gutterBottom>
          Paramètres
        </Typography>

        {/* Informations du compte */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Informations du compte
            </Typography>
            <Typography variant="body1">
              <strong>Email :</strong> {user?.email}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Compte créé le {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </Typography>
          </CardContent>
        </Card>

        {/* Connexions aux plateformes */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Connexions aux plateformes
            </Typography>
            
            {connectedPlatforms.length < 2 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Connectez au moins 2 plateformes pour utiliser la synchronisation
              </Alert>
            )}

            <List>
              {['spotify', 'deezer', 'youtube'].map((platform, index) => {
                const isConnected = connectedPlatforms.includes(platform);
                const connection = connections?.find(c => c.platform === platform);
                
                return (
                  <Box key={platform}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            {isConnected ? <CloudDone color="success" /> : <CloudOff color="disabled" />}
                            <Typography variant="subtitle1">
                              {platformNames[platform]}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          isConnected ? (
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Connecté le {new Date(connection.created_at).toLocaleDateString()}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Expire le {new Date(connection.expires_at).toLocaleDateString()}
                              </Typography>
                            </Box>
                          ) : (
                            'Non connecté'
                          )
                        }
                      />
                      <ListItemSecondaryAction>
                        {isConnected ? (
                          <Box display="flex" gap={1} alignItems="center">
                            <Chip
                              label="Connecté"
                              color="success"
                              size="small"
                            />
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDisconnect(platform)}
                              disabled={disconnectMutation.isLoading}
                            >
                              Déconnecter
                            </Button>
                          </Box>
                        ) : (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleConnect(platform)}
                            sx={{
                              bgcolor: platformColors[platform],
                              '&:hover': {
                                bgcolor: platformColors[platform],
                                opacity: 0.8,
                              },
                            }}
                          >
                            Connecter
                          </Button>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < 2 && <Divider />}
                  </Box>
                );
              })}
            </List>
          </CardContent>
        </Card>

        {/* Informations sur la synchronisation */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              À propos de la synchronisation
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              La synchronisation se fait automatiquement toutes les 30 minutes pour les playlists actives.
              Vous pouvez également lancer une synchronisation manuelle à tout moment.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Les pistes sont recherchées par titre et artiste sur chaque plateforme.
              Certaines pistes peuvent ne pas être trouvées si elles ne sont pas disponibles
              sur une plateforme spécifique.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vos tokens d'authentification sont stockés de manière sécurisée et ne sont
              utilisés que pour accéder à vos playlists sur les plateformes connectées.
            </Typography>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
} 