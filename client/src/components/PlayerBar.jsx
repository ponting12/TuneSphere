import { useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';

const DEFAULT_ART = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23111'/><circle cx='50' cy='50' r='30' fill='none' stroke='%23333' stroke-width='4'/><circle cx='50' cy='50' r='12' fill='none' stroke='%23333' stroke-width='2'/><circle cx='50' cy='50' r='3' fill='%23333'/></svg>";

export default function PlayerBar() {
  const {
    currentTrack, isPlaying, setIsPlaying,
    volume, setVolume, muted, toggleMute,
    currentTime, setCurrentTime, duration, setDuration,
    shuffle, toggleShuffle, repeat, toggleRepeat,
    nextTrack, prevTrack, audioRef,
    handleToggleFavorite, showToast,
    ytActive, setYtActive,
  } = usePlayer();

  const ytRef    = useRef(null);  // YT.Player instance
  const ytReady  = useRef(false);
  const ytTimer  = useRef(null);
  const pendingVideoIdRef = useRef(null);  // videoId to load when YT becomes ready
  const loadedVideoIdRef  = useRef(null);  // videoId currently loaded in YT player
  const isPlayingRef = useRef(isPlaying);  // keep latest isPlaying for callbacks

  // Keep isPlayingRef in sync
  isPlayingRef.current = isPlaying;

  // ── Load YouTube IFrame API once ────────────────────────
  useEffect(() => {
    const initPlayer = () => {
      if (ytRef.current) return;
      try {
        ytRef.current = new window.YT.Player('yt-player', {
          height: '150', width: '200',
          playerVars: { 
            autoplay: 0, 
            controls: 0, 
            disablekb: 1, 
            fs: 0, 
            rel: 0, 
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            onReady: () => {
              ytReady.current = true;
              // If there was a pending video from before YT was ready, load it now
              if (pendingVideoIdRef.current) {
                const vid = pendingVideoIdRef.current;
                pendingVideoIdRef.current = null;
                if (isPlayingRef.current) ytRef.current.loadVideoById(vid);
                else                      ytRef.current.cueVideoById(vid);
                loadedVideoIdRef.current = vid;
              }
            },
            onStateChange: (e) => {
              const S = window.YT.PlayerState;
              if (e.data === S.PLAYING) {
                setIsPlaying(true);
                if (ytTimer.current) clearInterval(ytTimer.current);
                ytTimer.current = setInterval(() => {
                  if (!ytRef.current) return;
                  setCurrentTime(ytRef.current.getCurrentTime?.() || 0);
                  setDuration(ytRef.current.getDuration?.() || 0);
                }, 400);
              } else if (e.data === S.PAUSED || e.data === S.CUED) {
                setIsPlaying(false);
                clearInterval(ytTimer.current);
              } else if (e.data === S.ENDED) {
                clearInterval(ytTimer.current);
                setIsPlaying(false);
                if (repeat) { ytRef.current.seekTo(0); ytRef.current.playVideo(); }
                else nextTrack();
              }
            },
            onError: (e) => {
              console.error('YouTube Player Error:', e.data);
              let msg = 'YouTube playback error';
              if (e.data === 2) msg = 'Invalid Video ID';
              else if (e.data === 5) msg = 'HTML5 Player Error';
              else if (e.data === 100) msg = 'Video not found';
              else if (e.data === 101 || e.data === 150) msg = 'Playback restricted/blocked by owner';
              showToast(`${msg} (Code: ${e.data})`, '⚠️');
              nextTrack();
            },
          },
        });
      } catch (err) {
        console.error('Error initializing YT Player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
      if (!document.getElementById('yt-api-script')) {
        const tag = document.createElement('script');
        tag.id  = 'yt-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }
  }, [repeat, nextTrack, setIsPlaying, setCurrentTime, setDuration, showToast]);

  // ── React to track changes ───────────────────────────────
  useEffect(() => {
    if (!currentTrack) return;

    if (currentTrack.videoId) {
      // YouTube track
      setYtActive(true);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      
      if (ytReady.current && ytRef.current) {
        // YT player is ready — load now
        loadedVideoIdRef.current = currentTrack.videoId;
        if (isPlaying) ytRef.current.loadVideoById(currentTrack.videoId);
        else           ytRef.current.cueVideoById(currentTrack.videoId);
      } else {
        // YT player not ready yet — store as pending; onReady will load it
        pendingVideoIdRef.current = currentTrack.videoId;
      }
    } else {
      // HTML5 audio track
      setYtActive(false);
      pendingVideoIdRef.current = null;
      if (ytRef.current && ytReady.current) { try { ytRef.current.stopVideo(); } catch {} }
      clearInterval(ytTimer.current);
      if (audioRef.current) {
        audioRef.current.src = currentTrack.src || '';
        if (isPlaying) audioRef.current.play().catch(() => {});
      }
    }
  }, [currentTrack]);

  // ── React to isPlaying changes ──────────────────────────
  useEffect(() => {
    if (currentTrack?.videoId && ytReady.current && ytRef.current) {
      // If the correct video isn't loaded yet, load it first
      if (loadedVideoIdRef.current !== currentTrack.videoId) {
        loadedVideoIdRef.current = currentTrack.videoId;
        if (isPlaying) ytRef.current.loadVideoById(currentTrack.videoId);
        else           ytRef.current.cueVideoById(currentTrack.videoId);
      } else {
        if (isPlaying) ytRef.current.playVideo();
        else           ytRef.current.pauseVideo();
      }
    } else if (audioRef.current) {
      if (isPlaying) audioRef.current.play().catch(() => {});
      else           audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  // ── Volume sync ─────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) { audioRef.current.volume = volume; audioRef.current.muted = muted; }
    if (ytRef.current && ytReady.current) {
      try {
        muted ? ytRef.current.mute() : ytRef.current.unMute();
        ytRef.current.setVolume(volume * 100);
      } catch {}
    }
  }, [volume, muted]);

  // ── HTML5 audio event listeners ────────────────────────
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    const onEnd  = () => { if (repeat) el.currentTime = 0; else nextTrack(); };
    el.addEventListener('timeupdate',     onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended',          onEnd);
    return () => { el.removeEventListener('timeupdate', onTime); el.removeEventListener('loadedmetadata', onMeta); el.removeEventListener('ended', onEnd); };
  }, [repeat, nextTrack]);

  const fmt = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  };

  // Persist last played for "Continue listening" rail
  useEffect(() => {
    if (!currentTrack?._id) return;
    try {
      const raw = localStorage.getItem('ts_last_played');
      const parsed = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(parsed) ? parsed : [];
      const next = [currentTrack._id, ...arr.filter((id) => id !== currentTrack._id)];
      localStorage.setItem('ts_last_played', JSON.stringify(next.slice(0, 12)));
    } catch {}
  }, [currentTrack?._id]);

  const seekPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volPct  = volume * 100;


  const handleSeek = (e) => {
    const val = Number(e.target.value);
    if (currentTrack?.videoId && ytRef.current && ytReady.current) {
      ytRef.current.seekTo(val, true);
    } else if (audioRef.current && isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = val;
    }
    setCurrentTime(val);
  };

  const mode = repeat ? 'Repeat' : shuffle ? 'Shuffle' : 'Normal';

  return (
    <>
      {/* Hidden HTML5 audio element */}
      <audio ref={audioRef} preload="metadata" />

      {/* Hidden YouTube IFrame container */}
      <div style={{ position: 'fixed', bottom: '110px', right: '20px', width: '200px', height: '150px', zIndex: -10, opacity: 0.01, pointerEvents: 'none', overflow: 'hidden' }}>
        <div id="yt-player" aria-hidden="true" />
      </div>

      <footer className="player">
        {/* Left: Track info */}
        <div className="player-left">
          <div className="player-art-container">
            <img src={currentTrack?.artwork || DEFAULT_ART} alt="Album art" />
            <div className="art-sheen" />
          </div>
          <div className="track-info">
            <div className="track-title">{currentTrack?.title || 'Select a track'}</div>
            <div className="track-artist">{currentTrack?.artist || '—'}</div>
          </div>
          <button className={`favorite-heart-btn ${currentTrack?.isFavorite ? 'favorited' : ''}`}
            onClick={() => currentTrack && handleToggleFavorite(currentTrack._id)}>♥</button>
        </div>

        {/* Center: Controls + timeline */}
        <div className="player-center">
          <div className="controls-wrapper">
            <div className="controls">
              <button className="icon-btn" onClick={prevTrack}>⏮</button>
              <button className="play-btn" onClick={() => setIsPlaying(p => !p)}>
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button className="icon-btn" onClick={nextTrack}>⏭</button>
            </div>
          </div>
          <div className="timeline">
            <span className="time">{fmt(currentTime)}</span>
            <div className="range-container">
              <input type="range" id="seekBar" min={0} max={duration || 0} step={0.1}
                value={currentTime} onChange={handleSeek} />
              <div className="range-progress" style={{ width: `${seekPct}%` }} />
            </div>
            <span className="time">{fmt(duration)}</span>
          </div>
        </div>

        {/* Right: Volume + badge */}
        <div className="player-right">
          <div className="volume">
            <button className="icon-btn" onClick={toggleMute}>{muted || volume === 0 ? '🔇' : '🔊'}</button>
            <div className="range-container volume-range">
              <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                onChange={e => setVolume(Number(e.target.value))} />
              <div className="range-progress" style={{ width: `${muted ? 0 : volPct}%` }} />
            </div>
          </div>
          <div className="player-badges">
            <button className={`btn btn-secondary ${shuffle ? 'active' : ''}`} style={{ padding:'6px 10px', fontSize:'0.75rem' }} onClick={toggleShuffle}>🔀</button>
            <button className={`btn btn-secondary ${repeat  ? 'active' : ''}`} style={{ padding:'6px 10px', fontSize:'0.75rem' }} onClick={toggleRepeat}>🔁</button>
            <span className="badge">{mode}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
