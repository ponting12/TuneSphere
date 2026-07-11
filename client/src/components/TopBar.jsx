import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';

export default function TopBar({ onAddSong }) {
  const { allTracks, setTracks, setQueue, showToast } = usePlayer();
  const [searchMode, setSearchMode] = useState('local');
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (!query.trim()) return;
    const q = query.toLowerCase();
    const filtered = allTracks.filter(t =>
      t.title?.toLowerCase().includes(q) || t.artist?.toLowerCase().includes(q)
    );
    if (!filtered.length) { showToast('No results found', '🔍'); return; }
    setTracks(filtered);
    setQueue(filtered.map((_, i) => i));
    showToast(`${filtered.length} result(s) found`, '🔍');
  };

  return (
    <header className="topbar">
      <div className="search">
        <label className="search-label" htmlFor="searchInput">Search</label>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input id="searchInput" type="search" value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search tracks, artists..." autoComplete="off" />
          <button className="btn btn-primary" onClick={handleSearch}>Search</button>
        </div>
      </div>
      <div className="search-modes-wrapper">
        <span className="search-mode-label">Source:</span>
        <div className="search-modes">
          <button className={`btn btn-ghost ${searchMode === 'local' ? 'active' : ''}`}
            onClick={() => setSearchMode('local')}>Library</button>
          <button className={`btn btn-ghost ${searchMode === 'youtube' ? 'active' : ''}`}
            onClick={() => { setSearchMode('youtube'); showToast('Use Add Song to search YouTube', '💡', 3000); }}>YouTube</button>
        </div>
        <button className="btn btn-add-song" onClick={onAddSong}>➕ Add Song</button>
      </div>
    </header>
  );
}
