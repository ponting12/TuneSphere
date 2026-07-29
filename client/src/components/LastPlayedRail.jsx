import { useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';

const DEFAULT_ART = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23111'/><circle cx='50' cy='50' r='30' fill='none' stroke='%23333' stroke-width='4'/><circle cx='50' cy='50' r='12' fill='none' stroke='%23333' stroke-width='2'/><circle cx='50' cy='50' r='3' fill='%23333'/></svg>";

export default function LastPlayedRail() {
  const { allTracks, setCurrentIndex, setIsPlaying } = usePlayer();

  const lastIds = useMemo(() => {
    try {
      const raw = localStorage.getItem('ts_last_played');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const tracks = useMemo(() => {
    if (!lastIds.length) return [];
    const map = new Map(allTracks.map((t) => [t._id, t]));
    const out = [];
    for (const id of lastIds) {
      const t = map.get(id);
      if (t) out.push(t);
      if (out.length >= 8) break;
    }
    return out;
  }, [allTracks, lastIds]);

  if (!tracks.length) return null;

  const handlePlay = (trackId) => {
    const idx = allTracks.findIndex((x) => x._id === trackId);
    if (idx >= 0) {
      setCurrentIndex(idx);
      setIsPlaying(true);
    }
  };

  return (
    <section className="last-played-rail">
      <div className="last-played-header">
        <div className="last-played-heading-left">
          <h2 className="last-played-title">Continue listening</h2>
          <span className="last-played-subtitle">Recently played</span>
        </div>
      </div>

      <div className="last-played-grid" role="list">
        {tracks.map((t) => (
          <button
            key={t._id}
            className="last-played-card"
            onClick={() => handlePlay(t._id)}
            title={`${t.title} — ${t.artist}`}
          >
            <div className="last-played-art-wrap">
              <img src={t.artwork || DEFAULT_ART} alt="" loading="lazy" />
              <div className="last-played-play-overlay">
                <span className="last-played-play-icon">▶</span>
              </div>
            </div>
            <div className="last-played-meta">
              <div className="last-played-title-text">{t.title}</div>
              <div className="last-played-artist-text">{t.artist}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

