import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { toggleFavorite as apiFavorite } from '../services/api';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [tracks, setTracks]         = useState([]);
  const [allTracks, setAllTracks]   = useState([]);
  const [queue, setQueue]           = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [shuffle, setShuffle]       = useState(false);
  const [repeat, setRepeat]         = useState(false);
  const [volume, setVolume]         = useState(0.8);
  const [muted, setMuted]           = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]     = useState(0);
  const [theme, setTheme]           = useState(() => localStorage.getItem('ts_theme') || 'emerald');
  const [playlists, setPlaylists]   = useState([]);
  const [viewMode, setViewMode]     = useState('all');
  const [toasts, setToasts]         = useState([]);
  const [ytActive, setYtActive]     = useState(false);

  const audioRef = useRef(null);

  // Toast helper
  const showToast = useCallback((message, emoji = '🎵', duration = 2400) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, emoji }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  // Theme
  const changeTheme = useCallback((name) => {
    setTheme(name);
    localStorage.setItem('ts_theme', name);
    showToast(`Theme: ${name}`, '🎨');
  }, [showToast]);

  // Load all tracks into library
  const loadLibrary = useCallback((loadedTracks) => {
    setAllTracks(loadedTracks);
    setTracks(loadedTracks);
    setQueue(loadedTracks.map((_, i) => i));
  }, []);

  // Filtered view
  const switchView = useCallback((mode, playlistTracks = null) => {
    setViewMode(mode);
    let filtered = [];
    if (mode === 'all')       filtered = [...allTracks];
    else if (mode === 'favorites') filtered = allTracks.filter(t => t.isFavorite);
    else if (mode === 'uploads')   filtered = allTracks.filter(t => t.isUpload);
    else if (playlistTracks)       filtered = playlistTracks;
    setTracks(filtered);
    setQueue(filtered.map((_, i) => i));
    setCurrentIndex(0);
  }, [allTracks]);

  // Toggle favorite (calls API + updates local state)
  const handleToggleFavorite = useCallback(async (trackId) => {
    try {
      const { data } = await apiFavorite(trackId);
      const update = t => t._id === trackId ? data : t;
      setAllTracks(prev => prev.map(update));
      setTracks(prev => prev.map(update));
      showToast(data.isFavorite ? 'Added to Favorites ♥' : 'Removed from Favorites', data.isFavorite ? '♥' : '💔');
    } catch (e) {
      showToast('Error updating favorite', '⚠️');
    }
  }, [showToast]);

  // Next / Prev
  const nextTrack = useCallback(() => {
    if (!tracks.length) return;
    if (shuffle) {
      let idx = currentIndex;
      while (idx === currentIndex && tracks.length > 1) idx = Math.floor(Math.random() * tracks.length);
      setCurrentIndex(idx);
    } else {
      setCurrentIndex(i => (i + 1) % tracks.length);
    }
    setIsPlaying(true);
  }, [tracks, currentIndex, shuffle]);

  const prevTrack = useCallback(() => {
    if (!tracks.length) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    setCurrentIndex(i => (i - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  }, [tracks]);

  const togglePlay = useCallback(() => setIsPlaying(p => !p), []);
  const toggleShuffle = useCallback(() => { setShuffle(s => !s); showToast(shuffle ? 'Shuffle Off' : 'Shuffle On', '🔀'); }, [shuffle, showToast]);
  const toggleRepeat  = useCallback(() => { setRepeat(r => !r);   showToast(repeat  ? 'Repeat Off'  : 'Repeat On',  '🔁'); }, [repeat,  showToast]);
  const toggleMute    = useCallback(() => setMuted(m => !m), []);

  const currentTrack = tracks[currentIndex] || null;

  return (
    <PlayerContext.Provider value={{
      tracks, setTracks, allTracks, setAllTracks, loadLibrary,
      queue, setQueue, currentIndex, setCurrentIndex,
      currentTrack, isPlaying, setIsPlaying, togglePlay,
      shuffle, toggleShuffle, repeat, toggleRepeat,
      volume, setVolume, muted, toggleMute,
      currentTime, setCurrentTime, duration, setDuration,
      theme, changeTheme, playlists, setPlaylists,
      viewMode, switchView, toasts, showToast,
      audioRef, nextTrack, prevTrack,
      ytActive, setYtActive,
      handleToggleFavorite,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
