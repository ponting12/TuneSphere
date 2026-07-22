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

  return (
    <section className="last-played-rail">
      <div className="last-played-header">
        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Continue listening</h2>
        <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Your recently played tracks</div>
      </div>

      <div className="last-played-grid" role="list">
        {tracks.map((t) => (
          <button
            key={t._id}
            className="last-played-card"
            onClick={() => {
              const idx = allTracks.findIndex((x) => x._id === t._id);
              if (idx >= 0) {
                setCurrentIndex(idx);
                setIsPlaying(true);
              }
            }}
            title={t.title}
          >
            <img src={t.artwork || DEFAULT_ART} alt="" loading="lazy" />
            <div className="last-played-meta">
              <div className="last-played-title">{t.title}</div>
              <div className="last-played-artist">{t.artist}</div>
            </div>
            <div className="last-played-play">▶</div>
          </button>
        ))}
      </div>
    </section>
  );
}

