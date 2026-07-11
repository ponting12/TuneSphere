import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getTracks     = ()              => api.get('/tracks');
export const uploadTrack   = (formData)      => api.post('/tracks/upload', formData);
export const addYouTubeTrack = (data)        => api.post('/tracks/youtube', data);
export const toggleFavorite  = (id)          => api.patch(`/tracks/${id}/favorite`);
export const deleteTrack     = (id)          => api.delete(`/tracks/${id}`);

export const getPlaylists  = ()              => api.get('/playlists');
export const createPlaylist = (name)         => api.post('/playlists', { name });
export const addToPlaylist  = (id, trackId)  => api.put(`/playlists/${id}/add`, { trackId });
export const removeFromPlaylist = (id, trackId) => api.put(`/playlists/${id}/remove`, { trackId });
export const deletePlaylist = (id)           => api.delete(`/playlists/${id}`);

export const searchYouTube  = (q)            => api.get(`/youtube/search?q=${encodeURIComponent(q)}`);
