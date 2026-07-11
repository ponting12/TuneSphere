import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { addYouTubeTrack, searchYouTube } from '../services/api';

function extractYouTubeId(url) {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export default function AddSongModal({ onClose }) {
  const { setAllTracks, setTracks, setQueue, setCurrentIndex, setIsPlaying, showToast } = usePlayer();
  const [tab, setTab] = useState('url');
  const [urlValue, setUrlValue] = useState('');
  const [ytQuery, setYtQuery] = useState('');
  const [ytResults, setYtResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addAndPlay = (track) => {
    setAllTracks(prev => {
      const updated = [...prev, track];
      setTracks(updated);
      setQueue(updated.map((_, i) => i));
      setCurrentIndex(updated.length - 1);
      return updated;
    });
    setIsPlaying(true);
    onClose();
  };

  const handleAddUrl = async () => {
    const raw = urlValue.trim();
    if (!raw) { showToast('Please enter a URL', '⚠️'); return; }
    const videoId = extractYouTubeId(raw);
    if (videoId) {
      try {
        const { data } = await addYouTubeTrack({ videoId, title: `YouTube: ${videoId}`, artist: 'YouTube', artwork: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` });
        addAndPlay(data);
        showToast('YouTube track added!', '▶');
      } catch { showToast('Failed to add YouTube track', '⚠️'); }
    } else if (raw.startsWith('http')) {
      const t = { _id: Date.now().toString(), title: raw.split('/').pop().split('?')[0] || 'Track', artist: 'External', artwork: '/bgimage.jpg', src: raw };
      addAndPlay(t);
      showToast('Track added!', '🎵');
    } else {
      showToast('Invalid URL. Paste a YouTube or direct audio URL.', '⚠️', 3500);
    }
  };

  const handleYTSearch = async () => {
    if (!ytQuery.trim()) return;
    setLoading(true);
    try {
      const { data } = await searchYouTube(ytQuery);
      setYtResults(data);
      if (!data.length) showToast('No results found', '🔍');
    } catch (e) {
      showToast(e.response?.data?.error || 'YouTube search failed. Add API key to .env', '⚠️', 4000);
    }
    setLoading(false);
  };

  const handlePickYT = async (r) => {
    try {
      const { data } = await addYouTubeTrack({ videoId: r.videoId, title: r.title, artist: r.channel, artwork: r.thumbnail });
      addAndPlay(data);
      showToast(`Playing: ${r.title}`, '▶', 2500);
    } catch { showToast('Failed to add track', '⚠️'); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <header className="modal-header">
          <h2 className="modal-title">🎵 Add Any Song</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </header>
        <div className="add-tabs">
          <button className={`add-tab-btn ${tab === 'url' ? 'active' : ''}`} onClick={() => setTab('url')}>🔗 Paste URL</button>
          <button className={`add-tab-btn ${tab === 'ytsearch' ? 'active' : ''}`} onClick={() => setTab('ytsearch')}>🔍 YouTube Search</button>
        </div>
        {tab === 'url' && (
          <div className="tab-pane">
            <p className="tab-desc">Paste a <strong>YouTube URL</strong> or direct <strong>audio URL</strong> to instantly add &amp; play.</p>
            <div className="url-input-row">
              <input type="url" value={urlValue} onChange={e => setUrlValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
                placeholder="https://youtube.com/watch?v=... or direct .mp3 URL" />
              <button className="btn btn-primary" onClick={handleAddUrl}>Add &amp; Play</button>
            </div>
            <div className="url-examples">
              <span className="url-example-label">Examples:</span>
              <code>https://youtu.be/dQw4w9WgXcQ</code>
              <code>https://example.com/song.mp3</code>
            </div>
          </div>
        )}
        {tab === 'ytsearch' && (
          <div className="tab-pane">
            <p className="tab-desc">Search YouTube by song name. Requires <strong>YT_API_KEY</strong> in <code>.env</code>.</p>
            <div className="url-input-row">
              <input type="search" value={ytQuery} onChange={e => setYtQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleYTSearch()}
                placeholder="Search any song, artist..." />
              <button className="btn btn-primary" onClick={handleYTSearch}>{loading ? '...' : 'Search'}</button>
            </div>
            {loading && <div className="yt-loading"><div className="spinner" /> Searching…</div>}
            <div className="yt-results-grid">
              {ytResults.map(r => (
                <div key={r.videoId} className="yt-result-item" onClick={() => handlePickYT(r)}>
                  <div className="yt-result-thumb"><img src={r.thumbnail} alt="" loading="lazy" /></div>
                  <div className="yt-result-info">
                    <div className="yt-result-title">{r.title}</div>
                    <div className="yt-result-channel">{r.channel}</div>
                  </div>
                  <div className="yt-result-play-btn">▶</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
