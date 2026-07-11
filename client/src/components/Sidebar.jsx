import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { createPlaylist as apiCreate, deletePlaylist as apiDelete } from '../services/api';

export default function Sidebar() {
  const { theme, changeTheme, viewMode, switchView, playlists, setPlaylists, showToast } = usePlayer();
  const [playlistName, setPlaylistName] = useState('');

  const handleCreate = async () => {
    const name = playlistName.trim();
    if (!name) return;
    try {
      const { data } = await apiCreate(name);
      setPlaylists(prev => [...prev, data]);
      setPlaylistName('');
      showToast(`Playlist "${name}" created`, '🎶');
    } catch (e) {
      showToast(e.response?.data?.error || 'Error creating playlist', '⚠️');
    }
  };

  const handleDelete = async (playlist) => {
    try {
      await apiDelete(playlist._id);
      setPlaylists(prev => prev.filter(p => p._id !== playlist._id));
      showToast('Playlist deleted', '🗑️');
    } catch {
      showToast('Error deleting playlist', '⚠️');
    }
  };

  const handlePlaylistClick = (pl) => {
    switchView(pl._id, pl.tracks);
  };

  const themes = [
    { key: 'emerald', label: 'Emerald Flow' },
    { key: 'retrowave', label: 'Retro Wave' },
    { key: 'deepspace', label: 'Deep Space' },
    { key: 'sunset', label: 'Sunset Gold' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img className="brand-logo" src="/spotify-logo-spotify-social-media-icon-free-png.webp" alt="TuneSphere" />
        <span className="brand-title">TuneSphere</span>
      </div>

      <nav className="sidebar-nav">
        <a href="#" className={`sidebar-link ${viewMode === 'all' ? 'active' : ''}`} onClick={e => { e.preventDefault(); switchView('all'); }}>📁 Library</a>
        <a href="#" className={`sidebar-link ${viewMode === 'favorites' ? 'active' : ''}`} onClick={e => { e.preventDefault(); switchView('favorites'); }}>♥ Favorites</a>
        <a href="#" className={`sidebar-link ${viewMode === 'uploads' ? 'active' : ''}`} onClick={e => { e.preventDefault(); switchView('uploads'); }}>☁ Uploaded Audio</a>
      </nav>

      <div className="sidebar-divider" />

      <div className="sidebar-section">
        <h3 className="sidebar-heading">Playlists</h3>
        <div className="playlist-creator">
          <input value={playlistName} onChange={e => setPlaylistName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Create new playlist..." maxLength={24} />
          <button className="btn-icon-plus" onClick={handleCreate}>+</button>
        </div>
        <div className="playlist-list">
          {playlists.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--muted)', padding: '8px 12px' }}>No playlists yet</div>}
          {playlists.map(pl => (
            <div key={pl._id} className={`playlist-item ${viewMode === pl._id ? 'active' : ''}`} onClick={() => handlePlaylistClick(pl)}>
              <div className="playlist-meta"><span>🎵</span><span>{pl.name}</span><span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>({pl.tracks?.length || 0})</span></div>
              <button className="btn-delete-playlist" onClick={e => { e.stopPropagation(); handleDelete(pl); }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-section theme-section">
        <h3 className="sidebar-heading">Premium Themes</h3>
        <div className="theme-grid">
          {themes.map(t => (
            <button key={t.key} className={`theme-dot ${theme === t.key ? 'active' : ''}`}
              data-theme={t.key} title={t.label} onClick={() => changeTheme(t.key)} />
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <span className="shortcuts-hint">Press <kbd>?</kbd> for Keyboard Help</span>
      </div>
    </aside>
  );
}
