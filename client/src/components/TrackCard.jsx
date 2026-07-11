import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { addToPlaylist } from '../services/api';

export default function TrackCard({ track, index, isSelected }) {
  const { setCurrentIndex, setIsPlaying, handleToggleFavorite, playlists, showToast, setPlaylists } = usePlayer();
  const [ctxMenu, setCtxMenu] = useState(null);

  const handleClick = () => {
    setCurrentIndex(index);
    setIsPlaying(true);
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
          <img src={track.artwork || '/bgimage.jpg'} alt="" loading="lazy" />
          <div className="thumb-sheen"><div className="card-play-icon">▶</div></div>
        </div>
        <div className="track-body">
          <div className="track-art"><img src={track.artwork || '/bgimage.jpg'} alt="" loading="lazy" /></div>
          <div className="track-text">
            <div className="track-name" title={track.title}>{track.title}</div>
            <div className="track-artist" title={track.artist}>{track.artist}</div>
          </div>
          <div className="track-actions">{track.isFavorite ? '♥' : '♡'}</div>
        </div>
        <div className="track-progress"><div /></div>
      </div>

      {ctxMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setCtxMenu(null)} />
          <div className="ctx-menu" style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 200 }}>
            <div className="ctx-item" onClick={() => { handleToggleFavorite(track._id); setCtxMenu(null); }}>
              {track.isFavorite ? '💔 Remove from Favorites' : '♥ Add to Favorites'}
            </div>
            {playlists.length > 0 && <div className="ctx-separator" />}
            {playlists.map(pl => (
              <div key={pl._id} className="ctx-item" onClick={() => handleAddToPlaylist(pl)}>➕ Add to "{pl.name}"</div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
