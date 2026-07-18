import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { addToPlaylist, addYouTubeTrack } from '../services/api';

const DEFAULT_ART = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23111'/><circle cx='50' cy='50' r='30' fill='none' stroke='%23333' stroke-width='4'/><circle cx='50' cy='50' r='12' fill='none' stroke='%23333' stroke-width='2'/><circle cx='50' cy='50' r='3' fill='%23333'/></svg>";

export default function TrackCard({ track, index, isSelected }) {
  const { setCurrentIndex, setIsPlaying, handleToggleFavorite, playlists, showToast, setPlaylists, setAllTracks, setTracks, handleDeleteTrack, handleRemoveFromPlaylist, viewMode } = usePlayer();
  const [ctxMenu, setCtxMenu] = useState(null);

  const handleClick = async () => {
    if (track.isYouTubeSearch) {
      try {
        showToast('Adding YouTube track...', '➕');
        const { data: newTrack } = await addYouTubeTrack({
          videoId: track.videoId,
          title: track.title,
          artist: track.artist,
          artwork: track.artwork
        });
        setAllTracks(prev => [...prev, newTrack]);
        setTracks(prev => {
          const nextTracks = [...prev];
          nextTracks[index] = newTrack;
          return nextTracks;
        });
        setCurrentIndex(index);
        setIsPlaying(true);
        showToast(`Playing: ${newTrack.title}`, '▶');
      } catch (err) {
        showToast('Failed to add YouTube track', '⚠️');
      }
    } else {
      setCurrentIndex(index);
      setIsPlaying(true);
    }
  };

  const handleCtx = (e) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  const handleAddToPlaylist = async (pl) => {
    try {
      const { data } = await addToPlaylist(pl._id, track._id);
      setPlaylists(prev => prev.map(p => p._id === pl._id ? data : p));
      showToast(`Added to "${pl.name}"`, '➕');
    } catch {
      showToast('Already in playlist or error', 'ℹ️');
    }
    setCtxMenu(null);
  };

  const isCustomPlaylist = viewMode !== 'all' && viewMode !== 'favorites' && viewMode !== 'uploads' && viewMode !== 'youtube_search';

  return (
    <>
      <div
        className={`track-card ${isSelected ? 'selected' : ''}`}
        role="listitem" tabIndex={0}
        onClick={handleClick}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleClick()}
        onContextMenu={handleCtx}
      >
        {track.videoId && <div className="track-yt-badge">YT</div>}
        <div className="track-thumb">
          <img src={track.artwork || DEFAULT_ART} alt="" loading="lazy" />
          <div className="thumb-sheen"><div className="card-play-icon">▶</div></div>
        </div>
        <div className="track-body">
          <div className="track-art"><img src={track.artwork || DEFAULT_ART} alt="" loading="lazy" /></div>
          <div className="track-text">
            <div className="track-name" title={track.title}>{track.title}</div>
            <div className="track-artist" title={track.artist}>{track.artist}</div>
          </div>
          <div className="track-actions" onClick={e => { e.stopPropagation(); handleToggleFavorite(track._id); }}>
            {track.isFavorite ? '♥' : '♡'}
          </div>
        </div>
        <div className="track-progress"><div /></div>
      </div>

      {ctxMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setCtxMenu(null)} />
          <div className="ctx-menu" style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 200 }}>
            {!track.isYouTubeSearch && (
              <div className="ctx-item" onClick={() => { handleToggleFavorite(track._id); setCtxMenu(null); }}>
                {track.isFavorite ? '💔 Remove from Favorites' : '♥ Add to Favorites'}
              </div>
            )}
            
            {isCustomPlaylist && (
              <div className="ctx-item" style={{ color: 'var(--danger)' }} onClick={() => { handleRemoveFromPlaylist(viewMode, track._id); setCtxMenu(null); }}>
                ❌ Remove from Playlist
              </div>
            )}

            {!track.isYouTubeSearch && (
              <div className="ctx-item" style={{ color: 'var(--danger)' }} onClick={() => { handleDeleteTrack(track._id); setCtxMenu(null); }}>
                🗑️ Delete Track
              </div>
            )}

            {playlists.length > 0 && !track.isYouTubeSearch && <div className="ctx-separator" />}
            {playlists.map(pl => (
              <div key={pl._id} className="ctx-item" onClick={() => handleAddToPlaylist(pl)}>➕ Add to "{pl.name}"</div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
