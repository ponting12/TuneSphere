import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { searchYouTube, getSuggestions } from '../services/api';

export default function TopBar({ onAddSong }) {
  const { allTracks, setTracks, setQueue, switchView, showToast } = usePlayer();
  const [searchMode, setSearchMode] = useState('local');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const triggerSearch = async (searchTerm) => {
    const term = searchTerm || query;
    if (!term.trim()) return;

    if (searchMode === 'local') {
      const q = term.toLowerCase();
      const filtered = allTracks.filter(t =>
        t.title?.toLowerCase().includes(q) || t.artist?.toLowerCase().includes(q)
      );
      if (filtered.length > 0) {
        switchView('all');
        setTracks(filtered);
        setQueue(filtered.map((_, i) => i));
        showToast(`${filtered.length} track(s) found in library`, '🔍');
      } else {
        // Smart fallback: Auto-search YouTube if no local results
        showToast('Not in library. Searching YouTube...', '🔍');
        setSearchMode('youtube');
        try {
          const { data } = await searchYouTube(term);
          if (!data || !data.length) {
            showToast('No YouTube results found', '⚠️');
            return;
          }
          const ytTracks = data.map(item => ({
            _id: `yt_${item.videoId}`,
            videoId: item.videoId,
            title: item.title,
            artist: item.channel,
            artwork: item.thumbnail,
            isYouTubeSearch: true
          }));
          switchView('youtube_search');
          setTracks(ytTracks);
          setQueue(ytTracks.map((_, i) => i));
          showToast(`Found ${ytTracks.length} tracks on YouTube`, '🔍');
        } catch (err) {
          showToast('YouTube search failed. Check key.', '⚠️');
        }
      }
    } else {
      showToast('Searching YouTube...', '🔍');
      try {
        const { data } = await searchYouTube(term);
        if (!data || !data.length) {
          showToast('No YouTube results found', '⚠️');
          return;
        }
        const ytTracks = data.map(item => ({
          _id: `yt_${item.videoId}`,
          videoId: item.videoId,
          title: item.title,
          artist: item.channel,
          artwork: item.thumbnail,
          isYouTubeSearch: true
        }));
        switchView('youtube_search');
        setTracks(ytTracks);
        setQueue(ytTracks.map((_, i) => i));
        showToast(`Found ${ytTracks.length} tracks on YouTube`, '🔍');
      } catch (err) {
        showToast('YouTube search failed. Check key.', '⚠️');
      }
    }
  };

  const handleQueryChange = async (val) => {
    setQuery(val);
    if (searchMode !== 'youtube' || !val.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const { data } = await getSuggestions(val);
      setSuggestions(data || []);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    triggerSearch(suggestion);
  };

  return (
    <header className="topbar">
      <div className="search" style={{ position: 'relative' }}>
        <label className="search-label" htmlFor="searchInput">Search</label>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input id="searchInput" type="search" value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={e => e.key === 'Enter' && (triggerSearch(query), setShowSuggestions(false))}
            placeholder="Search tracks, artists..." autoComplete="off" />
          <button className="btn-search" onClick={() => { triggerSearch(query); setShowSuggestions(false); }}>Search</button>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowSuggestions(false)} />
            <div className="search-suggestions-dropdown">
              {suggestions.map((suggestion, idx) => (
                <div key={idx} className="suggestion-item" onClick={() => handleSuggestionClick(suggestion)}>
                  <span className="suggestion-icon">🔍</span>
                  <span className="suggestion-text">{suggestion}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="search-modes-wrapper">
        <span className="search-mode-label">Source:</span>
        <div className="search-modes">
          <button className={`btn-mode-tab ${searchMode === 'local' ? 'active' : ''}`}
            onClick={() => setSearchMode('local')}>Library</button>
          <button className={`btn-mode-tab ${searchMode === 'youtube' ? 'active' : ''}`}
            onClick={() => setSearchMode('youtube')}>YouTube</button>
        </div>
        <button className="btn-add-song" onClick={onAddSong}>➕ Add Song</button>
      </div>
    </header>
  );
}
