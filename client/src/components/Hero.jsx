import { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import TrackCard from './TrackCard';
import NowPlayingCard from './NowPlayingCard';
import LastPlayedRail from './LastPlayedRail';

const DEFAULT_ART = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23111'/><circle cx='50' cy='50' r='30' fill='none' stroke='%23333' stroke-width='4'/><circle cx='50' cy='50' r='12' fill='none' stroke='%23333' stroke-width='2'/><circle cx='50' cy='50' r='3' fill='%23333'/></svg>";

export default function Hero() {
  const { currentTrack, isPlaying, tracks, currentIndex, viewMode, playlists, setCurrentIndex, setIsPlaying } = usePlayer();
  const heroCanvasRef    = useRef(null);
  const vizAnimRef       = useRef(null);

  let viewTitle = "Library";
  if (viewMode === "favorites") viewTitle = "Favorites";
  else if (viewMode === "uploads") viewTitle = "Uploaded Audio";
  else if (viewMode === "youtube_search") viewTitle = "YouTube Search Results";
  else if (viewMode !== "all") {
    const pl = playlists.find(p => p._id === viewMode);
    if (pl) viewTitle = pl.name;
  }

  const playLibrary = () => {
    if (tracks.length > 0) {
      setCurrentIndex(0);
      setIsPlaying(true);
    }
  };

  // Idle + live visualizer animation
  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;

    const tick = () => {
      vizAnimRef.current = requestAnimationFrame(tick);
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width)   canvas.width  = rect.width;
      if (canvas.height !== rect.height) canvas.height = rect.height;

      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#1db954';
      const cx = W / 2, cy = H / 2;
      const radius = Math.min(W, H) * 0.4;
      const bars = 60, now = Date.now() / 1000;
      const step = (Math.PI * 2) / bars;

      for (let i = 0; i < bars; i++) {
        const ang  = i * step - Math.PI / 2;
        const wave = isPlaying
          ? Math.abs(Math.sin(now * 3 + i * 0.4)) * 28 + 4
          : Math.abs(Math.sin(now * 1.2 + i * 0.35)) * 10 + 2;
        ctx.strokeStyle = accent;
        ctx.globalAlpha = isPlaying
          ? 0.2 + Math.abs(Math.sin(now * 2 + i * 0.2)) * 0.5
          : 0.1 + Math.abs(Math.sin(now + i * 0.15)) * 0.15;
        ctx.lineWidth = 2.2;
        ctx.lineCap   = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * (radius - 2), cy + Math.sin(ang) * (radius - 2));
        ctx.lineTo(cx + Math.cos(ang) * (radius + wave), cy + Math.sin(ang) * (radius + wave));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    vizAnimRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(vizAnimRef.current);
  }, [isPlaying]);

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-art">
          <div className="vinyl-container">
            <div className={`vinyl ${isPlaying ? 'spinning' : ''}`}>
              <img src={currentTrack?.artwork || DEFAULT_ART} alt="Album art" className="vinyl-art" />
              <div className="vinyl-overlay" />
              <div className="vinyl-hole" />
            </div>
            <canvas ref={heroCanvasRef} className="visualizer-canvas" aria-hidden="true" />
          </div>
        </div>
        <div className="hero-info" style={{ flex: 1, maxWidth: 420 }}>
          <NowPlayingCard />
          <div className="hero-actions">
            <button className="btn-primary" onClick={playLibrary}>▶ Play Library</button>
          </div>
        </div>
      </section>

      <LastPlayedRail />

      {/* Track Grid */}
      <div className="tracks-grid-wrapper">
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.5px' }}>
          {viewTitle}
        </h2>
        <div className="tracks-grid" role="list">
          {tracks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎵</div>
              <div className="empty-title">No tracks found</div>
              <div className="empty-text">Upload MP3s or add YouTube songs using the Add Song button.</div>
            </div>
          ) : (
            tracks.map((track, i) => (
              <TrackCard key={track._id || i} track={track} index={i} isSelected={i === currentIndex} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
