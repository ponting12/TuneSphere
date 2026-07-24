import { usePlayer } from '../context/PlayerContext';

const DEFAULT_ART = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23111'/><circle cx='50' cy='50' r='30' fill='none' stroke='%23333' stroke-width='4'/><circle cx='50' cy='50' r='12' fill='none' stroke='%23333' stroke-width='2'/><circle cx='50' cy='50' r='3' fill='%23333'/></svg>";

export default function NowPlayingCard() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    prevTrack,
    handleToggleFavorite,
  } = usePlayer();

  const fmt = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hasTrack = !!currentTrack;

  return (
    <div className={`np-spotify-card ${hasTrack && isPlaying ? 'np-spotify-active' : ''}`}>
      {/* Top section: Artwork + Info side by side */}
      <div className="np-spotify-top">
        {/* Large Album Artwork */}
        <div className="np-spotify-art">
          <img
            src={currentTrack?.artwork || DEFAULT_ART}
            alt="Album art"
            className="np-spotify-art-img"
          />
          {hasTrack && (
            <button
              className="np-spotify-art-play-btn"
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
          )}
        </div>

        {/* Track Info */}
        <div className="np-spotify-info">
          <div className="np-spotify-badge-row">
            {hasTrack && isPlaying ? (
              <span className="np-spotify-eq">
                <span className="np-eq-bar np-eq-1" />
                <span className="np-eq-bar np-eq-2" />
                <span className="np-eq-bar np-eq-3" />
                <span className="np-eq-bar np-eq-4" />
              </span>
            ) : hasTrack ? (
              <span className="np-spotify-paused-dot">●</span>
            ) : null}
            <span className="np-spotify-status">
              {hasTrack ? (isPlaying ? 'NOW PLAYING' : 'PAUSED') : 'NO TRACK SELECTED'}
            </span>
          </div>

          <div className="np-spotify-title" title={currentTrack?.title || '—'}>
            {currentTrack?.title || 'Select a track to play'}
          </div>
          <div className="np-spotify-artist" title={currentTrack?.artist || '—'}>
            {currentTrack?.artist || 'Browse your library and click a track'}
          </div>

          {/* Favorite button */}
          {hasTrack && (
            <button
              className={`np-spotify-fav ${currentTrack?.isFavorite ? 'np-spotify-fav-active' : ''}`}
              onClick={(e) => { e.stopPropagation(); handleToggleFavorite(currentTrack._id); }}
              aria-label="Toggle favorite"
            >
              {currentTrack?.isFavorite ? '♥' : '♡'}
            </button>
          )}
        </div>
      </div>

      {/* Bottom section: Controls + Progress */}
      {hasTrack && (
        <div className="np-spotify-bottom">
          {/* Playback controls */}
          <div className="np-spotify-controls">
            <button className="np-spotify-ctrl-btn" onClick={prevTrack} aria-label="Previous track">⏮</button>
            <button className="np-spotify-main-play-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="np-spotify-ctrl-btn" onClick={nextTrack} aria-label="Next track">⏭</button>
          </div>

          {/* Progress bar */}
          <div className="np-spotify-progress-area">
            <span className="np-spotify-time">{fmt(currentTime)}</span>
            <div className="np-spotify-track" style={{ '--np-progress': `${progressPct}%` }}>
              <div className="np-spotify-track-bg" />
              <div className="np-spotify-track-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="np-spotify-time">{fmt(duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

