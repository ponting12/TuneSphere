/*
  Music player UI with responsive layout.

  Notes about “YouTube Music API”:
  - There is no official YouTube Music *search-to-audio-playback* API for browsers.
  - To keep this fully client-side and working immediately, we:
    1) Provide demo tracks (works without any API key)
    2) Optional: enable YouTube search via YouTube Data API v3 (requires an API key)
    3) For audio playback, browsers cannot directly play YouTube streams due to CORS/ToS.

  So: YouTube search can populate the track list, but audio playback uses demo audio URLs by default.
*/

const $ = (sel) => document.querySelector(sel);

const audio = document.getElementById('audio');
const tracksList = document.getElementById('tracksList');
const emptyState = document.getElementById('emptyState');

const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const muteBtn = document.getElementById('muteBtn');
const muteIcon = document.getElementById('muteIcon');

const seekBar = document.getElementById('seekBar');
const volumeBar = document.getElementById('volumeBar');
const currentTimeEl = document.getElementById('currentTime');
const durationTimeEl = document.getElementById('durationTime');

const playerTitle = document.getElementById('playerTitle');
const playerArtist = document.getElementById('playerArtist');
const playerArtwork = document.getElementById('playerArtwork');

const tracksCount = document.getElementById('tracksCount');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const badgeMode = document.getElementById('badgeMode');

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const playFirstBtn = document.getElementById('playFirstBtn');

const modeLocalBtn = document.getElementById('modeLocalBtn');
const modeYouTubeBtn = document.getElementById('modeYouTubeBtn');


let state = {
  tracks: [],
  selectedIndex: 0,
  isPlaying: false,
  shuffle: false,
  repeat: false,

  // Current search mode: 'local' or 'youtube'
  searchMode: 'local',

  // For YouTube results: store metadata, but use demo audio playback unless user supplies own audio URLs.
  ytMode: false,

  // Next-up queue: holds track indices in playback order.
  queue: []
};


function ensureQueue(){
  if (!Array.isArray(state.queue) || state.queue.length !== state.tracks.length){
    state.queue = state.tracks.map((_, idx) => idx);
  }
}


const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2,'0')}`;
};

function setModeBadge(){
  const mode = state.repeat ? 'Repeat' : (state.shuffle ? 'Shuffle' : 'Normal');
  badgeMode.textContent = mode;

  // Vinyl visual spin uses real playback state, so we don't set it here.


  shuffleBtn.setAttribute('aria-pressed', String(state.shuffle));
  repeatBtn.setAttribute('aria-pressed', String(state.repeat));

  shuffleBtn.classList.toggle('active', state.shuffle);
  repeatBtn.classList.toggle('active', state.repeat);
}

const DEMO_ART = 'bgimage.jpg';
// Demo tracks use publicly hosted MP3s (usually CORS-safe). If any fail, replace with local audio.
// You can add local files and point src to relative paths.
const DEMO_TRACKS = [
  {
    title: 'Neon Dreams',
    artist: 'Demo Artist',
    artwork: DEMO_ART,
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  },
  {
    title: 'Midnight Pulse',
    artist: 'Demo Artist',
    artwork: DEMO_ART,
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
  },
  {
    title: 'Golden Hour',
    artist: 'Demo Artist',
    artwork: DEMO_ART,
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
  },
  {
    title: 'Skyline Haze',
    artist: 'Demo Artist',
    artwork: DEMO_ART,
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
  },
  {
    title: 'Electric Avenue',
    artist: 'Demo Artist',
    artwork: DEMO_ART,
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'
  },
  {
    title: 'Afterglow',
    artist: 'Demo Artist',
    artwork: DEMO_ART,
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3'
  }
];

function renderTracks(){
  tracksList.innerHTML = '';
  const frag = document.createDocumentFragment();

  tracksCount.textContent = `${state.tracks.length} track${state.tracks.length === 1 ? '' : 's'}`;
  emptyState.hidden = state.tracks.length > 0;

  state.tracks.forEach((t, i) => {
    const isSelected = i === state.selectedIndex;
    const card = document.createElement('div');
    card.className = 'track-card' + (isSelected ? ' selected' : '');
    if (isSelected && state.isPlaying) card.classList.add('playing');
    card.setAttribute('role','listitem');
    card.tabIndex = 0;

    card.innerHTML = `
      <div class="track-thumb">
        ${t.artwork ? `<img src="${t.artwork}" alt="" loading="lazy" />` : ''}
        <div class="thumb-sheen" aria-hidden="true"></div>
      </div>
      <div class="track-body">
        <div class="track-art">${t.artwork ? `<img src="${t.artwork}" alt="" loading="lazy" />` : ''}</div>
        <div class="track-text">
          <div class="track-name" title="${escapeHtml(t.title)}">${escapeHtml(t.title)}</div>
          <div class="track-artist" title="${escapeHtml(t.artist)}">${escapeHtml(t.artist)}</div>
        </div>
        <div class="track-actions" aria-hidden="true">▶</div>
      </div>
      <div class="track-progress" aria-hidden="true"><div></div></div>
    `;

    const select = () => {
      state.selectedIndex = i;
      // YouTube mode: do not autoplay until user clicks (this is only called on click).
      loadSelectedTrack({ autoplay: true });
      renderTracks();
      renderQueue();
    };

    card.addEventListener('click', select);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select();
      }
    });

    frag.appendChild(card);
  });

  tracksList.appendChild(frag);
}


function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'<','>':'>','"':'"',"'":'&#39;'
  }[c]));
}

function updatePlayerUI(){
  const t = state.tracks[state.selectedIndex];
  if (!t) return;
  playerTitle.textContent = t.title || '—';
  playerArtist.textContent = t.artist || '—';
  playerArtwork.src = t.artwork || DEMO_ART;
}

async function loadSelectedTrack({ autoplay = false } = {}){
  const t = state.tracks[state.selectedIndex];
  if (!t) return;

  updatePlayerUI();

  ensureQueue();
  // Keep queue order aligned: selectedIndex becomes the “now playing” element.
  // We also rotate queue so the current track is at queue[0].
  const qPos = state.queue.indexOf(state.selectedIndex);
  if (qPos > 0) {
    state.queue = [...state.queue.slice(qPos), ...state.queue.slice(0, qPos)];
  }

  // Playback source:
  // - If t.src exists, use it.
  // - For YouTube search results, we won't have a direct playable src.
  //   We fallback to a demo src so the player still works.
  const srcToPlay = t.src || DEMO_TRACKS[state.selectedIndex % DEMO_TRACKS.length].src;

  seekBar.value = 0;
  currentTimeEl.textContent = '0:00';
  durationTimeEl.textContent = '0:00';

  audio.src = srcToPlay;

  try {
    if (autoplay) {
      await audio.play();
      state.isPlaying = true;
      playIcon.textContent = '⏸';
      syncPlayingVisuals();
    } else {
      state.isPlaying = false;
      playIcon.textContent = '▶';
      syncPlayingVisuals();
    }
  } catch {
    // Autoplay might be blocked; keep UI ready.
    state.isPlaying = false;
    playIcon.textContent = '▶';
    syncPlayingVisuals();
  }

  renderTracks();
  renderQueue();
}


function togglePlay(){
  if (!state.tracks.length) return;

  if (audio.paused) {
    audio.play().then(() => {
      state.isPlaying = true;
      playIcon.textContent = '⏸';
      syncPlayingVisuals();
    }).catch(() => {
      // ignore
    });
  } else {
    audio.pause();
    state.isPlaying = false;
    playIcon.textContent = '▶';
    syncPlayingVisuals();
  }
}


function nextTrack(){
  if (!state.tracks.length) return;
  ensureQueue();

  if (state.shuffle) {
    let idx = state.selectedIndex;
    while (idx === state.selectedIndex && state.tracks.length > 1) {
      idx = Math.floor(Math.random() * state.tracks.length);
    }
    state.selectedIndex = idx;
  } else {
    const pos = state.queue.indexOf(state.selectedIndex);
    if (pos >= 0) {
      const nextPos = pos + 1;
      if (nextPos < state.queue.length) {
        state.selectedIndex = state.queue[nextPos];
      } else {
        // wrap to first
        state.selectedIndex = state.queue[0] ?? state.selectedIndex;
      }
    } else {
      state.selectedIndex = (state.selectedIndex + 1) % state.tracks.length;
    }
  }

  loadSelectedTrack({ autoplay: true });
}


function prevTrack(){
  if (!state.tracks.length) return;
  ensureQueue();

  if (state.shuffle) {
    let idx = state.selectedIndex;
    while (idx === state.selectedIndex && state.tracks.length > 1) {
      idx = Math.floor(Math.random() * state.tracks.length);
    }
    state.selectedIndex = idx;
  } else {
    const pos = state.queue.indexOf(state.selectedIndex);
    if (pos >= 0) {
      const prevPos = pos - 1;
      if (prevPos >= 0) {
        state.selectedIndex = state.queue[prevPos];
      } else {
        state.selectedIndex = state.queue[state.queue.length - 1] ?? state.selectedIndex;
      }
    } else {
      state.selectedIndex = (state.selectedIndex - 1 + state.tracks.length) % state.tracks.length;
    }
  }

  loadSelectedTrack({ autoplay: true });
}


function updateSeek(){
  const dur = audio.duration;
  const cur = audio.currentTime;
  if (Number.isFinite(dur) && dur > 0) {
    seekBar.max = String(dur);
    seekBar.value = String(cur);
    durationTimeEl.textContent = formatTime(dur);

    const pct = Math.max(0, Math.min(1, cur / dur)) * 100;
    const card = tracksList.querySelectorAll('.track-card')[state.selectedIndex];
    if (card) {
      const bar = card.querySelector('.track-progress > div');
      if (bar) bar.style.width = `${pct}%`;
    }
  }
  currentTimeEl.textContent = formatTime(cur);
}


function seekTo(value){
  const dur = audio.duration;
  if (!Number.isFinite(dur) || dur <= 0) return;
  audio.currentTime = Math.min(Math.max(0, Number(value)), dur);
}

function toggleMute(){
  audio.muted = !audio.muted;
  muteIcon.textContent = audio.muted ? '🔇' : '🔊';
}

function syncPlayingVisuals(){
  const cards = tracksList.querySelectorAll('.track-card');
  cards.forEach((c, idx) => {
    c.classList.toggle('playing', idx === state.selectedIndex && !audio.paused);
  });

  const vinyl = document.getElementById('vinyl');
  if (vinyl) {
    vinyl.classList.toggle('spinning', !audio.paused);
  }
}


function setVolume(v){
  const vol = Math.min(1, Math.max(0, Number(v)));
  audio.volume = vol;
  if (vol === 0) {
    audio.muted = true;
    muteIcon.textContent = '🔇';
  } else {
    audio.muted = false;
    muteIcon.textContent = '🔊';
  }
}

async function searchYouTube(query, maxResults = 9){
  const apiKey = window.YT_API_KEY || '';
  if (!apiKey) return [];

  // YouTube Data API v3: search endpoint.
  // This returns video results, not music player audio directly.
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part','snippet');
  url.searchParams.set('type','video');
  url.searchParams.set('q', query);
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('key', apiKey);
  url.searchParams.set('safeSearch','strict');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);

  const data = await res.json();
  const items = data.items || [];

  return items.map((it) => {
    const title = it.snippet?.title || 'Unknown title';
    const videoId = it.id?.videoId;
    const artist = it.snippet?.channelTitle || 'YouTube';
    const artwork = it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || DEMO_ART;

    // Playback is not possible directly from YouTube in this setup.
    return {
      title,
      artist,
      artwork,
      src: null,
      videoId
    };
  });
}

function filterLocalTracks(query){
  const q = String(query || '').toLowerCase().trim();
  if (!q) return [...state.tracks];

  // Filter across the currently loaded library.
  return state.tracks.filter((t) => {
    const title = (t.title || '').toLowerCase();
    const artist = (t.artist || '').toLowerCase();
    return title.includes(q) || artist.includes(q);
  });
}

async function runSearch(){
  const q = (searchInput.value || '').trim();
  if (!q) return;

  // Client-side local filtering of whatever is currently in `state.tracks`.
  // If YouTube API key exists, we still keep behavior as: no autoplay until click.
  try {
    const apiKey = window.YT_API_KEY || '';
    const wantYouTube = state.searchMode === 'youtube' && !!apiKey;


    tracksList.innerHTML = '';
    emptyState.hidden = true;

    if (!wantYouTube) {
      // Local filter mode
      const filtered = filterLocalTracks(q);
      if (!filtered.length) {
        emptyState.hidden = false;
        emptyState.querySelector('.empty-text').textContent = 'No matches in your library.';
        renderFilteredTracks(filtered);
        return;
      }

      renderFilteredTracks(filtered);
      return;
    }


    const results = await searchYouTube(q, 9);

    if (!results.length) {
      emptyState.hidden = false;
      state.tracks = [];
      renderTracks();
      return;
    }

    state.tracks = results.map((r, i) => ({
      title: r.title,
      artist: r.artist,
      artwork: r.artwork || DEMO_ART,
      src: DEMO_TRACKS[i % DEMO_TRACKS.length].src,
      yt: r
    }));

    state.selectedIndex = 0;
    renderTracks();

    // Important: do NOT autoplay until user clicks a result.
    // Update UI but keep audio paused.
    updatePlayerUI();
    syncPlayingVisuals();

  } catch (e) {
    emptyState.hidden = false;
    emptyState.querySelector('.empty-text').textContent = 'Search failed.';
    console.error(e);
  }
}

function renderFilteredTracks(filtered){
  state.tracks = filtered;
  state.selectedIndex = 0;
  ensureQueue();
  renderTracks();
  renderQueue();
  updatePlayerUI();
  syncPlayingVisuals();
}




// Queue + playlist rendering
function getQueueItemTitle(trackIndex){
  const t = state.tracks[trackIndex];
  if (!t) return { title: '—', artist: '—', artwork: DEMO_ART };
  return { title: t.title || '—', artist: t.artist || '—', artwork: t.artwork || DEMO_ART };
}

const queueList = document.getElementById('queueList');
const queueCount = document.getElementById('queueCount');
const queueEmpty = document.getElementById('queueEmpty');
const clearQueueBtn = document.getElementById('clearQueueBtn');

function renderQueue(){
  if (!queueList) return;
  ensureQueue();

  // Remove the currently playing track from the “Next up” list.
  const nowIdx = state.selectedIndex;
  const next = state.queue.filter((idx) => idx !== nowIdx);

  queueCount.textContent = String(next.length);
  queueEmpty && (queueEmpty.hidden = next.length > 0);

  queueList.innerHTML = '';
  const frag = document.createDocumentFragment();

  // queue items: show “Now playing” as playing card if it exists
  const playingThumb = getQueueItemTitle(nowIdx);
  const playingItem = document.createElement('div');
  playingItem.className = 'queue-item playing';
  playingItem.draggable = true;
  playingItem.dataset.trackIndex = String(nowIdx);
  playingItem.setAttribute('role','listitem');
  playingItem.tabIndex = 0;
  playingItem.innerHTML = `
    <div class="queue-thumb">${playingThumb.artwork ? `<img src="${playingThumb.artwork}" alt="" loading="lazy"/>` : ''}</div>
    <div class="queue-text">
      <div class="queue-title">${escapeHtml(playingThumb.title)}</div>
      <div class="queue-artist">${escapeHtml(playingThumb.artist)}</div>
    </div>
    <div class="queue-actions" aria-hidden="true">⏵</div>
  `;
  frag.appendChild(playingItem);

  next.forEach((trackIndex) => {
    const meta = getQueueItemTitle(trackIndex);
    const item = document.createElement('div');
    item.className = 'queue-item';
    item.draggable = true;
    item.dataset.trackIndex = String(trackIndex);
    item.setAttribute('role','listitem');
    item.tabIndex = 0;
    item.innerHTML = `
      <div class="queue-thumb">${meta.artwork ? `<img src="${meta.artwork}" alt="" loading="lazy"/>` : ''}</div>
      <div class="queue-text">
        <div class="queue-title">${escapeHtml(meta.title)}</div>
        <div class="queue-artist">${escapeHtml(meta.artist)}</div>
      </div>
      <div class="queue-actions" aria-hidden="true">⏭</div>
    `;

    const playFromQueue = () => {
      state.selectedIndex = trackIndex;
      loadSelectedTrack({ autoplay: true });
    };

    item.addEventListener('click', playFromQueue);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        playFromQueue();
      }
    });

    frag.appendChild(item);
  });

  queueList.appendChild(frag);
  attachQueueDnD();
}

let dndDragIndex = null;
function attachQueueDnD(){
  if (!queueList) return;

  const items = queueList.querySelectorAll('.queue-item');
  items.forEach((el) => {
    el.addEventListener('dragstart', () => {
      dndDragIndex = Number(el.dataset.trackIndex);
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      dndDragIndex = null;

      // Cleanup overlays
      queueList.querySelectorAll('.queue-item.over').forEach((x) => x.classList.remove('over'));
    });
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.classList.add('over');
    });
    el.addEventListener('dragleave', () => {
      el.classList.remove('over');
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('over');
      if (dndDragIndex == null) return;
      const dropIndex = Number(el.dataset.trackIndex);
      reorderQueueByTrackIndices(dndDragIndex, dropIndex);
    });
  });
}

function reorderQueueByTrackIndices(fromIdx, toIdx){
  ensureQueue();
  if (fromIdx === toIdx) return;

  // Reorder the underlying queue array that includes selected track too.
  const fromPos = state.queue.indexOf(fromIdx);
  const toPos = state.queue.indexOf(toIdx);
  if (fromPos < 0 || toPos < 0) return;

  const nextQueue = [...state.queue];
  nextQueue.splice(fromPos, 1);
  nextQueue.splice(toPos, 0, fromIdx);
  state.queue = nextQueue;

  renderQueue();
}

// Events
playBtn.addEventListener('click', togglePlay);
nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);
muteBtn.addEventListener('click', toggleMute);

seekBar.addEventListener('input', (e) => {
  // live scrub feel
  seekTo(e.target.value);
});
seekBar.addEventListener('change', (e) => {
  seekTo(e.target.value);
});

volumeBar.addEventListener('input', (e) => setVolume(e.target.value));

shuffleBtn.addEventListener('click', () => {
  state.shuffle = !state.shuffle;
  if (state.shuffle) state.repeat = false;
  setModeBadge();
  renderQueue();
});
repeatBtn.addEventListener('click', () => {
  state.repeat = !state.repeat;
  if (state.repeat) state.shuffle = false;
  setModeBadge();
  renderQueue();
});

if (modeLocalBtn) {
  modeLocalBtn.addEventListener('click', () => {
    state.searchMode = 'local';
    state.ytMode = false;

    modeLocalBtn.setAttribute('aria-pressed', 'true');
    modeYouTubeBtn && modeYouTubeBtn.setAttribute('aria-pressed', 'false');

    modeLocalBtn.classList.add('active');
    modeYouTubeBtn && modeYouTubeBtn.classList.remove('active');

    // Run search in local mode (filter)
    runSearch();
  });
}

if (modeYouTubeBtn) {
  modeYouTubeBtn.addEventListener('click', () => {
    state.searchMode = 'youtube';
    state.ytMode = true;

    modeLocalBtn && modeLocalBtn.setAttribute('aria-pressed', 'false');
    modeYouTubeBtn.setAttribute('aria-pressed', 'true');

    modeYouTubeBtn.classList.add('active');
    modeLocalBtn && modeLocalBtn.classList.remove('active');

    runSearch();
  });
}

searchBtn.addEventListener('click', runSearch);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runSearch();
});


playFirstBtn.addEventListener('click', () => {
  if (!state.tracks.length) {
    state.tracks = [...DEMO_TRACKS];
    state.selectedIndex = 0;
    ensureQueue();
    renderTracks();
    renderQueue();
  }
  loadSelectedTrack({ autoplay: true });
});

// Upload local audio
const fileInput = document.getElementById('fileInput');
if (fileInput) {
  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []);
    if (!files.length) return;

    const newTracks = files.map((file) => ({
      title: file.name.replace(/\.[^/.]+$/,'') || 'Local track',
      artist: 'Local',
      artwork: DEMO_ART,
      src: URL.createObjectURL(file)
    }));

    state.tracks = [...state.tracks, ...newTracks];
    state.selectedIndex = state.tracks.length - 1;
    ensureQueue();
    renderTracks();
    renderQueue();

    // Start playing the last uploaded track.
    loadSelectedTrack({ autoplay: true });
  });
}

if (clearQueueBtn) {
  clearQueueBtn.addEventListener('click', () => {
    if (!state.tracks.length) return;
    // Keep current track only.
    state.queue = [state.selectedIndex];
    renderQueue();
  });
}


audio.addEventListener('timeupdate', updateSeek);
audio.addEventListener('loadedmetadata', updateSeek);

audio.addEventListener('ended', () => {
  if (state.repeat) {
    loadSelectedTrack({ autoplay: true });
  } else {
    nextTrack();
  }
});

// Keyboard shortcuts
function isTypingTarget(el){
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return el.isContentEditable === true;
}

document.addEventListener('keydown', (e) => {
  if (isTypingTarget(e.target)) return;

  switch (e.key) {
    case ' ': {
      e.preventDefault();
      togglePlay();
      break;
    }
    case 'm':
    case 'M': {
      toggleMute();
      break;
    }
    case 's':
    case 'S': {
      state.shuffle = !state.shuffle;
      if (state.shuffle) state.repeat = false;
      setModeBadge();
      renderQueue();
      break;
    }
    case 'r':
    case 'R': {
      state.repeat = !state.repeat;
      if (state.repeat) state.shuffle = false;
      setModeBadge();
      renderQueue();
      break;
    }
    case 'ArrowLeft': {
      e.preventDefault();
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = Math.max(0, audio.currentTime - 5);
      }
      break;
    }
    case 'ArrowRight': {
      e.preventDefault();
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
      }
      break;
    }
    case 'n':
    case 'N': {
      nextTrack();
      break;
    }
    case 'p':
    case 'P': {
      prevTrack();
      break;
    }
  }
});


audio.addEventListener('play', () => {
  state.isPlaying = true;
  playIcon.textContent = '⏸';
});

audio.addEventListener('pause', () => {
  state.isPlaying = false;
  playIcon.textContent = '▶';
});

  // Init
(function init(){
  state.tracks = [...DEMO_TRACKS];
  state.selectedIndex = 0;
  ensureQueue();
  setModeBadge();

  if (modeLocalBtn) {
    modeLocalBtn.setAttribute('aria-pressed', 'true');
    modeLocalBtn.classList.add('active');
  }
  if (modeYouTubeBtn) {
    modeYouTubeBtn.setAttribute('aria-pressed', 'false');
    modeYouTubeBtn.classList.remove('active');
  }

  renderTracks();
  renderQueue();
  updatePlayerUI();


  // Preload first track without autoplay.
  const t0 = state.tracks[0];
  if (t0?.src) {
    audio.src = t0.src;
  }

  // Default volume
  audio.volume = Number(volumeBar.value);
  audio.muted = false;
  muteIcon.textContent = '🔊';
})();

