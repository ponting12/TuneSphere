import { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import TrackCard from './TrackCard';

export default function Hero() {
  const { currentTrack, isPlaying, tracks, currentIndex } = usePlayer();
  const heroCanvasRef    = useRef(null);
  const vizAnimRef       = useRef(null);

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
          ? 0.3 + Math.abs(Math.sin(now * 2 + i * 0.2)) * 0.7
          : 0.15 + Math.abs(Math.sin(now + i * 0.15)) * 0.25;
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
              <img src={currentTrack?.artwork || '/bgimage.jpg'} alt="Album art" className="vinyl-art" />
              <div className="vinyl-overlay" />
              <div className="vinyl-hole" />
            </div>
            <canvas ref={heroCanvasRef} className="visualizer-canvas" aria-hidden="true" />
          </div>
        </div>
        <div className="hero-info">
          <div className="hero-badge">{isPlaying ? 'NOW PLAYING' : 'NOW STREAMING'}</div>
          <h1 className="hero-track-title">{currentTrack?.title || 'TuneSphere'}</h1>
          <p className="hero-track-artist">{currentTrack?.artist || 'Click a track to play'}</p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => {}}>▶ Play Library</button>
          </div>
        </div>
      </section>

      {/* Track Grid */}
      <div className="tracks-grid-wrapper">
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
