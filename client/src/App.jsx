import { useEffect, useState } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { getTracks, getPlaylists } from './services/api';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Hero from './components/Hero';
import QueuePanel from './components/QueuePanel';
import PlayerBar from './components/PlayerBar';
import AddSongModal from './components/AddSongModal';
import Toast from './components/Toast';
import ThemeEffects from './components/ThemeEffects';

function AppContent() {
  const { loadLibrary, setPlaylists, theme } = usePlayer();
  const [showAddSong, setShowAddSong] = useState(false);
  const [shortcutHelp, setShortcutHelp] = useState(false);
  // Load initial backend data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tracksRes, playlistsRes] = await Promise.all([
          getTracks(),
          getPlaylists()
        ]);
        loadLibrary(tracksRes.data);
        setPlaylists(playlistsRes.data);
      } catch (err) {
        console.error('Failed to load initial library data', err);
      }
    };
    fetchData();
  }, [loadLibrary, setPlaylists]);

  // Apply theme class to document body
  useEffect(() => {
    const themes = ['theme-emerald', 'theme-retrowave', 'theme-deepspace', 'theme-sunset', 'theme-dark', 'theme-light'];
    themes.forEach(t => document.body.classList.remove(t));
    const activeTheme = (theme === 'dark' || theme === 'light') ? theme : 'dark';
    document.body.classList.add(`theme-${activeTheme}`);
  }, [theme]);

  // Theme transition overlay on change
  useEffect(() => {
    const overlay = document.getElementById('theme-overlay');
    if (!overlay) return;
    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#1db954';
    overlay.style.background = `radial-gradient(circle, ${accent}22 0%, transparent 70%)`;
    overlay.classList.remove('animating');
    // Trigger reflow
    void overlay.offsetWidth;
    overlay.classList.add('animating');
    const timer = setTimeout(() => overlay.classList.remove('animating'), 700);
    return () => clearTimeout(timer);
  }, [theme]);

  // Global keydown listeners for shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) return;
      if (e.key === '?') {
        e.preventDefault();
        setShortcutHelp(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-layout">
      {/* Theme transition overlay */}
      <div id="theme-overlay" />

      {/* Ambient theme-specific effects (aurora, starfield, sun rays, dust motes) */}
      <ThemeEffects />

      {/* Toast notifications */}
      <Toast />

      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="main-content">
        <TopBar onAddSong={() => setShowAddSong(true)} />
        <Hero />
      </main>

      {/* Right Queue Sidebar */}
      <QueuePanel />

      {/* Bottom fixed audio control bar */}
      <PlayerBar />

      {/* Add Song Dialog */}
      {showAddSong && <AddSongModal onClose={() => setShowAddSong(false)} />}

      {/* Keyboard Shortcuts Dialog */}
      {shortcutHelp && (
        <dialog className="dialog" open onClick={e => e.target === e.currentTarget && setShortcutHelp(false)}>
          <div className="dialog-box">
            <header className="dialog-header">
              <h2 className="dialog-title">⌨️ Keyboard Shortcuts</h2>
              <button className="btn-close" onClick={() => setShortcutHelp(false)}>×</button>
            </header>
            <div className="dialog-body">
              <table className="shortcuts-table">
                <thead>
                  <tr><th>Key</th><th>Action</th></tr>
                </thead>
                <tbody>
                  <tr><td><kbd>Spacebar</kbd></td><td>Play / Pause audio playback</td></tr>
                  <tr><td><kbd>N</kbd> or <kbd>n</kbd></td><td>Play next track in queue</td></tr>
                  <tr><td><kbd>P</kbd> or <kbd>p</kbd></td><td>Play previous track in queue</td></tr>
                  <tr><td><kbd>M</kbd> or <kbd>m</kbd></td><td>Mute / Unmute audio output</td></tr>
                  <tr><td><kbd>S</kbd> or <kbd>s</kbd></td><td>Toggle Shuffle playback mode</td></tr>
                  <tr><td><kbd>R</kbd> or <kbd>r</kbd></td><td>Toggle Repeat loop mode</td></tr>
                  <tr><td><kbd>?</kbd></td><td>Show / Hide this shortcut menu</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  );
}
