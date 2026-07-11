import { useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';

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

  // ── Load YouTube IFrame API once ────────────────────────
  useEffect(() => {
    if (document.getElementById('yt-api-script')) return;
    const tag = document.createElement('script');
    tag.id  = 'yt-api-script';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      ytRef.current = new window.YT.Player('yt-player', {
        height: '1', width: '1',
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => { ytReady.current = true; },
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
          onError: () => { showToast('YouTube playback error', '⚠️'); nextTrack(); },
        },
      });
    };
  }, []);

  // ── React to track changes ───────────────────────────────
  useEffect(() => {
    if (!currentTrack) return;

    if (currentTrack.videoId) {
      // YouTube track
      setYtActive(true);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      if (ytReady.current && ytRef.current) {
        if (isPlaying) ytRef.current.loadVideoById(currentTrack.videoId);
        else           ytRef.current.cueVideoById(currentTrack.videoId);
      }
    } else {
      // HTML5 audio track
      setYtActive(false);
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
      if (isPlaying) ytRef.current.playVideo();
      else           ytRef.current.pauseVideo();
    } else if (audioRef.current) {
      if (isPlaying) audioRef.current.play().catch(() => {});
      else           audioRef.current.pause();
    }
  }, [isPlaying]);

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
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />

      {/* Hidden YouTube IFrame container */}
      <div id="yt-player" aria-hidden="true"
        style={{ position:'fixed', width:0, height:0, overflow:'hidden', top:-9999, left:-9999, pointerEvents:'none' }} />

      <footer className="player">
        {/* Left: Track info */}
        <div className="player-left">
          <div className="player-art-container">
            <img src={currentTrack?.artwork || '/bgimage.jpg'} alt="Album art" />
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
