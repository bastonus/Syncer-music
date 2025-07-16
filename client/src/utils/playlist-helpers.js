export const getPlaylistImage = (playlist, serviceId) => {
  switch (serviceId) {
    case 'spotify':
      return playlist.images?.[0]?.url || '';
    case 'deezer':
      return playlist.picture || playlist.picture_medium || '';
    case 'google':
      return playlist.snippet?.thumbnails?.default?.url || '';
    default:
      return '';
  }
};

export const getPlaylistName = (playlist, serviceId) => {
  switch (serviceId) {
    case 'spotify':
      return playlist.name || 'Sans nom';
    case 'deezer':
      return playlist.title || 'Sans nom';
    case 'google':
      return playlist.snippet?.title || 'Sans nom';
    default:
      return 'Sans nom';
  }
};

export const getPlaylistMeta = (playlist, serviceId) => {
  switch (serviceId) {
    case 'spotify':
      return `${playlist.tracks?.total || 0} pistes`;
    case 'deezer':
      return `${playlist.nb_tracks || 0} pistes`;
    case 'google':
      return playlist.snippet?.description || 'Playlist YouTube';
    default:
      return '';
  }
}; 