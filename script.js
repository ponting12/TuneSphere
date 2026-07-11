/*
  TuneSphere — Strict YouTube Player
  All music fetched & played via YouTube IFrame API + Data API v3.
  No local audio, no hardcoded tracks, fully dynamic.
*/
'use strict';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const YT_API_KEY = 'AIzaSyDqTnZOaUz5nPxTHRpR35Y3taUOBYgdFyo';

// ─── STATE ────────────────────────────────────────────────────────────────────
const state = {
  tracks: [],
  selectedIdx: 0,
  queue: [],
  favorites: new Set(),
  playlists: {},            // { name: [trackId,...] }
  viewMode: 'trending',
  isPlaying: false,
  shuffle: false,
  repeat: false,
  volume: 0.8,
  muted: false,
  currentPlaylistName: null,
};

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const searchInput      = $('searchInput');
const searchBtn        = $('searchBtn');
const searchStatusText = $('searchStatusText');
const tracksList       = $('tracksList');
const loadingState     = $('loadingState');
const emptyState       = $('emptyState');
const currentViewTitle = $('currentViewTitle');
const tracksCount      = $('tracksCount');
const queueList        = $('queueList');
const queueEmpty       = $('queueEmpty');
const queueCount       = $('queueCount');
const clearQueueBtn    = $('clearQueueBtn');
const playBtn          = $('playBtn');
const playIcon         = $('playIcon');
const prevBtn          = $('prevBtn');
const nextBtn          = $('nextBtn');
const muteBtn          = $('muteBtn');
const muteIcon         = $('muteIcon');
const seekBar          = $('seekBar');
const seekFill         = $('seekProgress');
const volumeBar        = $('volumeBar');
const volumeFill       = $('volumeProgress');
const currentTimeEl    = $('currentTime');
const durationTimeEl   = $('durationTime');
const playerArtwork    = $('playerArtwork');
const playerTitle      = $('playerTitle');
const playerArtist     = $('playerArtist');
const badgeMode        = $('badgeMode');
const favoriteBtn      = $('favoriteToggleBtn');
const shuffleBtn       = $('shuffleBtn');
const repeatBtn        = $('repeatBtn');
const playFirstBtn     = $('playFirstBtn');
const heroTitle        = $('heroTitle');
const heroArtist       = $('heroArtist');
const heroBadge        = $('heroBadge');
const heroBg           = $('heroBg');
const heroThumbImg     = $('heroThumbImg');
const toastContainer   = $('toastContainer');
const playlistInput    = $('playlistInput');
const createPlaylistBtn= $('createPlaylistBtn');
const playlistListEl   = $('playlistList');


// ─── YOUTUBE IFRAME API ───────────────────────────────────────────────────────
let ytPlayer        = null;
let ytReady         = false;
let ytTimeInterval  = null;
let ytPending       = null;   // { videoId, autoplay }

// Must be a true global — defined BEFORE YT API script loads
window.onYouTubeIframeAPIReady = function () {
  console.log('[YT] IFrame API ready, creating player...');
  ytPlayer = new YT.Player('yt-player', {
    height: '150',
    width:  '200',
    playerVars: {
      autoplay:        0,
      controls:        0,
      disablekb:       1,
      fs:              0,
      iv_load_policy:  3,
      modestbranding:  1,
      rel:             0,
    },
    events: {
      onReady:       onYTReady,
      onStateChange: onYTStateChange,
      onError:       onYTError,
    },
  });
};

function loadYouTubeIframeAPI() {
  if (document.getElementById('yt-api-script')) return;
  console.log('[YT] Loading IFrame API script...');
  const s = document.createElement('script');
  s.id  = 'yt-api-script';
  s.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(s);
}

function onYTReady() {
  ytReady = true;
  if (ytPending) {
    playYTVideo(ytPending.videoId, ytPending.autoplay);
    ytPending = null;
  }
}

function onYTStateChange(e) {
  const S = YT.PlayerState;
  if (e.data === S.PLAYING) {
    state.isPlaying = true;
    setPlayIcon(true);
    startSeekPoll();
  } else if (e.data === S.PAUSED || e.data === S.CUED) {
    state.isPlaying = false;
    setPlayIcon(false);
    stopSeekPoll();
  } else if (e.data === S.ENDED) {
    stopSeekPoll();
    state.isPlaying = false;
    setPlayIcon(false);
    if (state.repeat) {
      ytPlayer.seekTo(0); ytPlayer.playVideo();
    } else {
      nextTrack();
    }
  }
}

function onYTError(e) {
  const msgs = { 2:'Invalid video', 5:'HTML5 error', 100:'Video not found', 101:'Embedding disabled', 150:'Embedding disabled' };
  showToast(`Playback error: ${msgs[e.data] || 'Unknown'}`, 3000);
  nextTrack();
}

function playYTVideo(videoId, autoplay = true) {
  if (!ytReady || !ytPlayer) {
    ytPending = { videoId, autoplay };
    return;
  }
  if (autoplay) {
    ytPlayer.loadVideoById({ videoId });
  } else {
    ytPlayer.cueVideoById({ videoId });
  }
  setVolume(state.volume);
  if (state.muted) ytPlayer.mute(); else ytPlayer.unMute();
}

function startSeekPoll() {
  stopSeekPoll();
  ytTimeInterval = setInterval(() => {
    if (!ytPlayer || !ytReady) return;
    try {
      const cur = ytPlayer.getCurrentTime() || 0;
      const dur = ytPlayer.getDuration()    || 0;
      currentTimeEl.textContent  = fmtTime(cur);
      durationTimeEl.textContent = fmtTime(dur);
      if (dur > 0) {
        seekBar.max   = String(dur);
        seekBar.value = String(cur);
        seekFill.style.width = `${(cur / dur) * 100}%`;
      }
    } catch {}
  }, 400);
}

function stopSeekPoll() {
  if (ytTimeInterval) { clearInterval(ytTimeInterval); ytTimeInterval = null; }
}

// ─── YOUTUBE DATA API v3 ─────────────────────────────────────────────────────
async function ytSearch(query, maxResults = 15) {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part',          'snippet');
  url.searchParams.set('type',          'video');
  url.searchParams.set('videoCategoryId','10');     // Music
  url.searchParams.set('q',             query);
  url.searchParams.set('maxResults',    String(maxResults));
  url.searchParams.set('key',           YT_API_KEY);
  const res  = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return (data.items || []).map(item => ({
    id:       item.id.videoId,
    title:    item.snippet.title,
    channel:  item.snippet.channelTitle,
    thumb:    item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    videoId:  item.id.videoId,
  }));
}

// ─── TRACK OPERATIONS ────────────────────────────────────────────────────────
function loadTracks(tracks, title) {
  state.tracks = tracks;
  state.selectedIdx = 0;
  state.queue = tracks.map((_, i) => i);
  currentViewTitle.textContent = title;
  tracksCount.textContent = `${tracks.length} tracks`;
  renderTracks();
  renderQueue();
  updateHero();
  updatePlayerUI();
}

function selectTrack(idx, autoplay = true) {
  state.selectedIdx = idx;
  state.isPlaying   = autoplay;
  updateHero();
  updatePlayerUI();
  renderTracks();  // update playing highlight
  renderQueue();

  const t = state.tracks[idx];
  if (!t) return;
  playYTVideo(t.videoId, autoplay);
}

function nextTrack() {
  if (!state.tracks.length) return;
  let next;
  if (state.shuffle) {
    next = Math.floor(Math.random() * state.tracks.length);
  } else {
    next = (state.selectedIdx + 1) % state.tracks.length;
  }
  selectTrack(next, true);
}

function prevTrack() {
  if (!state.tracks.length) return;
  let prev = (state.selectedIdx - 1 + state.tracks.length) % state.tracks.length;
  selectTrack(prev, true);
}

function togglePlay() {
  if (!ytPlayer || !ytReady) return;
  if (state.isPlaying) {
    ytPlayer.pauseVideo();
  } else {
    if (state.tracks.length) {
      ytPlayer.playVideo();
    }
  }
}

function setVolume(vol) {
  state.volume = vol;
  if (ytPlayer && ytReady) ytPlayer.setVolume(vol * 100);
  volumeBar.value = vol;
  volumeFill.style.width = `${vol * 100}%`;
}

function toggleMute() {
  state.muted = !state.muted;
  if (ytPlayer && ytReady) {
    state.muted ? ytPlayer.mute() : ytPlayer.unMute();
  }
  updateMuteIcon();
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function renderTracks() {
  if (!state.tracks.length) {
    tracksList.innerHTML = '';
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  tracksList.innerHTML = state.tracks.map((t, i) => `
    <div class="track-card${i === state.selectedIdx ? ' playing' : ''}"
         role="listitem"
         data-idx="${i}">
      <div class="track-thumb">
        <img src="${escHtml(t.thumb)}" alt="" loading="lazy" />
        <div class="track-play-overlay">
          ${i === state.selectedIdx
            ? `<div class="eq-bars"><span></span><span></span><span></span></div>`
            : `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
          }
        </div>
      </div>
      <div class="track-info">
        <div class="track-name" title="${escHtml(t.title)}">${escHtml(t.title)}</div>
        <div class="track-artist">${escHtml(t.channel)}</div>
      </div>
    </div>
  `).join('');

  // Click events
  tracksList.querySelectorAll('.track-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = Number(card.dataset.idx);
      if (idx === state.selectedIdx && state.isPlaying) {
        togglePlay();
      } else {
        selectTrack(idx, true);
      }
    });
  });
}

function renderQueue() {
  const tracks = state.tracks;
  if (!tracks.length) {
    queueList.innerHTML = '';
    queueEmpty.hidden = false;
    queueCount.textContent = '0';
    return;
  }
  queueEmpty.hidden = true;
  queueCount.textContent = String(tracks.length);
  queueList.innerHTML = tracks.map((t, i) => `
    <div class="queue-item${i === state.selectedIdx ? ' playing' : ''}" data-idx="${i}">
      <div class="queue-thumb">
        <img src="${escHtml(t.thumb)}" alt="" loading="lazy" />
      </div>
      <div class="queue-info">
        <div class="queue-name">${escHtml(t.title)}</div>
        <div class="queue-artist">${escHtml(t.channel)}</div>
      </div>
    </div>
  `).join('');

  queueList.querySelectorAll('.queue-item').forEach(item => {
    item.addEventListener('click', () => selectTrack(Number(item.dataset.idx), true));
  });
}

function updateHero() {
  const t = state.tracks[state.selectedIdx];
  if (!t) {
    heroTitle.textContent  = 'Click a track to play';
    heroArtist.textContent = '';
    heroBadge.textContent  = 'TUNESPHERE';
    heroThumbImg.src = '';
    heroBg.style.backgroundImage = '';
    return;
  }
  heroTitle.textContent  = t.title;
  heroArtist.textContent = t.channel;
  heroBadge.textContent  = state.isPlaying ? 'NOW PLAYING' : 'READY TO PLAY';
  heroThumbImg.src       = t.thumb;
  heroBg.style.backgroundImage = `url(${t.thumb})`;
}

function updatePlayerUI() {
  const t = state.tracks[state.selectedIdx];
  if (!t) {
    playerTitle.textContent  = 'Nothing playing';
    playerArtist.textContent = '—';
    playerArtwork.src        = '';
    return;
  }
  playerTitle.textContent  = t.title;
  playerArtist.textContent = t.channel;
  playerArtwork.src        = t.thumb;
  favoriteBtn.classList.toggle('active', state.favorites.has(t.videoId));
}

function setPlayIcon(playing) {
  if (playing) {
    playIcon.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
  } else {
    playIcon.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  }
}

function updateMuteIcon() {
  if (state.muted) {
    muteIcon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
  } else {
    muteIcon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
  }
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────
async function runSearch(query, categoryLabel) {
  showLoading(true);
  tracksList.innerHTML = '';
  emptyState.hidden = true;
  currentViewTitle.textContent = categoryLabel || query;
  tracksCount.textContent = '';
  searchStatusText.textContent = '';

  try {
    const results = await ytSearch(query, 15);
    showLoading(false);
    if (!results.length) {
      emptyState.hidden = false;
      emptyState.querySelector('.empty-text').textContent = `No results found for "${query}".`;
      return;
    }
    loadTracks(results, categoryLabel || `"${query}"`);
    searchStatusText.textContent = `${results.length} results for "${query}"`;
  } catch (err) {
    showLoading(false);
    emptyState.hidden = false;
    emptyState.querySelector('.empty-text').textContent = 'Search failed. Check your internet connection.';
    console.error('YouTube API error:', err);
    showToast(`API Error: ${err.message}`, 4000);
  }
}

function showLoading(show) {
  loadingState.style.display = show ? 'flex' : 'none';
}

// ─── FAVORITES ────────────────────────────────────────────────────────────────
function toggleFavorite() {
  const t = state.tracks[state.selectedIdx];
  if (!t) return;
  if (state.favorites.has(t.videoId)) {
    state.favorites.delete(t.videoId);
    showToast('Removed from favorites');
  } else {
    state.favorites.add(t.videoId);
    showToast('Added to favorites ❤️');
  }
  saveFavorites();
  favoriteBtn.classList.toggle('active', state.favorites.has(t.videoId));
}

function showFavorites() {
  const favTracks = state.tracks.filter(t => state.favorites.has(t.videoId));
  if (!favTracks.length) {
    showToast('No favorites yet — heart a track!');
    return;
  }
  loadTracks(favTracks, '❤️ Favorites');
}

function saveFavorites() {
  try { localStorage.setItem('ts_favorites', JSON.stringify([...state.favorites])); } catch {}
}
function loadFavorites() {
  try {
    const raw = localStorage.getItem('ts_favorites');
    if (raw) state.favorites = new Set(JSON.parse(raw));
  } catch {}
}

// ─── PLAYLISTS ────────────────────────────────────────────────────────────────
function savePlaylists() {
  try { localStorage.setItem('ts_playlists', JSON.stringify(state.playlists)); } catch {}
}
function loadPlaylists() {
  try {
    const raw = localStorage.getItem('ts_playlists');
    if (raw) state.playlists = JSON.parse(raw);
  } catch {}
}

function renderPlaylists() {
  const names = Object.keys(state.playlists);
  if (!names.length) { playlistListEl.innerHTML = ''; return; }
  playlistListEl.innerHTML = names.map(name => `
    <div class="playlist-item${state.currentPlaylistName === name ? ' active' : ''}" data-pl="${escHtml(name)}">
      <span>🎵</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(name)}</span>
      <button class="playlist-item-del" data-del="${escHtml(name)}" title="Delete playlist">✕</button>
    </div>
  `).join('');

  playlistListEl.querySelectorAll('.playlist-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.dataset.del) {
        const n = e.target.dataset.del;
        delete state.playlists[n];
        savePlaylists();
        if (state.currentPlaylistName === n) state.currentPlaylistName = null;
        renderPlaylists();
        return;
      }
      openPlaylist(el.dataset.pl);
    });
  });
}

function openPlaylist(name) {
  state.currentPlaylistName = name;
  const ids = state.playlists[name] || [];
  // Fetch current tracks matching those IDs if available
  const tracks = state.tracks.filter(t => ids.includes(t.videoId));
  if (!tracks.length) {
    showToast('Playlist is empty. Add tracks by playing them!');
    return;
  }
  loadTracks(tracks, `🎵 ${name}`);
  renderPlaylists();
}

function addCurrentToPlaylist(name) {
  const t = state.tracks[state.selectedIdx];
  if (!t) { showToast('No track selected'); return; }
  if (!state.playlists[name]) state.playlists[name] = [];
  if (!state.playlists[name].includes(t.videoId)) {
    state.playlists[name].push(t.videoId);
    savePlaylists();
    showToast(`Added to "${name}"`);
  } else {
    showToast('Already in playlist');
  }
  renderPlaylists();
}

// ─── SIDEBAR NAV ─────────────────────────────────────────────────────────────
const NAV_CATEGORIES = {
  trending:    { q: 'top music songs 2024',     label: '🔥 Trending' },
  pop:         { q: 'pop music hits 2024',       label: '🎤 Pop Hits' },
  hiphop:      { q: 'hip hop music 2024',         label: '🎧 Hip Hop' },
  rock:        { q: 'rock music hits',            label: '🎸 Rock' },
  electronic:  { q: 'electronic music 2024',      label: '🎛️ Electronic' },
  indie:       { q: 'indie music 2024',           label: '🎼 Indie' },
};

function setupNav() {
  document.querySelectorAll('.sidebar-link[data-cat]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const cat = link.dataset.cat;
      if (cat === 'favorites') {
        showFavorites();
        return;
      }
      const cfg = NAV_CATEGORIES[cat];
      if (cfg) runSearch(cfg.q, cfg.label);
    });
  });
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function fmtTime(s) {
  s = Math.floor(s);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, duration = 2500) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ─── EVENT WIRING ─────────────────────────────────────────────────────────────
function wireEvents() {
  // Search
  searchBtn.addEventListener('click', () => {
    const q = searchInput.value.trim();
    if (q) runSearch(q, `🔍 "${q}"`);
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = searchInput.value.trim();
      if (q) runSearch(q, `🔍 "${q}"`);
    }
  });

  // Player controls
  playBtn.addEventListener('click', togglePlay);
  prevBtn.addEventListener('click', prevTrack);
  nextBtn.addEventListener('click', nextTrack);
  muteBtn.addEventListener('click', toggleMute);

  favoriteBtn.addEventListener('click', toggleFavorite);

  shuffleBtn.addEventListener('click', () => {
    state.shuffle = !state.shuffle;
    shuffleBtn.classList.toggle('active', state.shuffle);
    shuffleBtn.setAttribute('aria-pressed', state.shuffle);
    badgeMode.textContent = state.shuffle ? 'Shuffle' : (state.repeat ? 'Repeat' : 'Normal');
    showToast(state.shuffle ? 'Shuffle on' : 'Shuffle off');
  });

  repeatBtn.addEventListener('click', () => {
    state.repeat = !state.repeat;
    repeatBtn.classList.toggle('active', state.repeat);
    repeatBtn.setAttribute('aria-pressed', state.repeat);
    badgeMode.textContent = state.repeat ? 'Repeat' : (state.shuffle ? 'Shuffle' : 'Normal');
    showToast(state.repeat ? 'Repeat on' : 'Repeat off');
  });

  playFirstBtn.addEventListener('click', () => {
    if (state.tracks.length) selectTrack(0, true);
  });

  // Seek bar
  seekBar.addEventListener('input', () => {
    const val = parseFloat(seekBar.value);
    seekFill.style.width = `${(val / parseFloat(seekBar.max || 1)) * 100}%`;
    if (ytPlayer && ytReady) ytPlayer.seekTo(val, true);
  });

  // Volume
  volumeBar.addEventListener('input', () => setVolume(parseFloat(volumeBar.value)));

  // Queue clear
  clearQueueBtn.addEventListener('click', () => {
    state.tracks = [];
    state.selectedIdx = 0;
    state.queue = [];
    state.isPlaying = false;
    if (ytPlayer && ytReady) ytPlayer.stopVideo();
    stopSeekPoll();
    setPlayIcon(false);
    renderTracks();
    renderQueue();
    updatePlayerUI();
    updateHero();
    showToast('Queue cleared');
  });

  // Playlist creation
  createPlaylistBtn.addEventListener('click', () => {
    const name = playlistInput.value.trim();
    if (!name) return;
    if (!state.playlists[name]) { state.playlists[name] = []; savePlaylists(); }
    playlistInput.value = '';
    addCurrentToPlaylist(name);
    renderPlaylists();
    showToast(`Playlist "${name}" created!`);
  });
  playlistInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') createPlaylistBtn.click();
  });


}

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  loadFavorites();
  loadPlaylists();
  renderPlaylists();
  setupNav();
  wireEvents();

  // Init volume UI
  volumeBar.value = state.volume;
  volumeFill.style.width = `${state.volume * 100}%`;
  updateMuteIcon();
  showLoading(true);

  // Load YouTube IFrame API eagerly
  loadYouTubeIframeAPI();

  // Fetch initial trending tracks
  try {
    const results = await ytSearch('top music songs 2024', 15);
    showLoading(false);
    if (results.length) {
      loadTracks(results, '🔥 Trending');
      showToast(`${results.length} tracks loaded from YouTube 🎵`);
    } else {
      emptyState.hidden = false;
    }
  } catch (err) {
    showLoading(false);
    emptyState.hidden = false;
    emptyState.querySelector('.empty-text').textContent = 'Failed to load. Check your API key or internet connection.';
    console.error('Init fetch error:', err);
    showToast(`Load error: ${err.message}`, 5000);
  }
}

document.addEventListener('DOMContentLoaded', init);
