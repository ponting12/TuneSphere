import { useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { uploadTrack } from '../services/api';

export default function QueuePanel() {
  const { tracks, queue, currentIndex, setCurrentIndex, setIsPlaying, setQueue, showToast, setAllTracks, setTracks } = usePlayer();
  const dragRef = useRef(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    for (const file of files) {
      try {
        const form = new FormData();
        form.append('audio', file);
        form.append('title', file.name.replace(/\.[^/.]+$/, ''));
        const { data: track } = await uploadTrack(form);
        setAllTracks(prev => [...prev, track]);
        setTracks(prev => [...prev, track]);
        setQueue(prev => [...prev, prev.length]);
        showToast(`Uploaded: ${track.title}`, '☁');
      } catch (err) {
        showToast(`Upload failed: ${file.name}`, '⚠️');
      }
    }
    e.target.value = '';
  };

  const clearQueue = () => {
    setQueue([currentIndex]);
    showToast('Queue cleared', '🧹');
  };

  const nextItems = queue.filter(i => i !== currentIndex);
  const nowTrack  = tracks[currentIndex];

  const handleDragStart = (idx) => dragRef.current = idx;
  const handleDrop = (toIdx) => {
    if (dragRef.current == null || dragRef.current === toIdx) return;
    const q = [...queue];
    const fromPos = q.indexOf(dragRef.current);
    const toPos   = q.indexOf(toIdx);
    if (fromPos < 0 || toPos < 0) return;
    q.splice(fromPos, 1);
    q.splice(toPos, 0, dragRef.current);
    setQueue(q);
    dragRef.current = null;
    showToast('Queue reordered', '🔀');
  };

  return (
    <aside className="queue">
      <div className="queue-header">
        <h2 className="section-title">Next up</h2>
        <div className="queue-meta">{nextItems.length}</div>
      </div>
      <div className="queue-controls">
        <label className="upload-btn">
          <span>📤</span> Upload MP3
          <input type="file" accept="audio/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
        </label>
        <button className="btn btn-ghost btn-sm" onClick={clearQueue}>Clear Queue</button>
      </div>
      <div className="queue-list">
        {nowTrack && (
          <div className="queue-item playing">
            <div className="queue-thumb"><img src={nowTrack.artwork || '/bgimage.jpg'} alt="" loading="lazy" /></div>
            <div className="queue-text">
              <div className="queue-title">{nowTrack.title}</div>
              <div className="queue-artist">{nowTrack.artist}</div>
            </div>
            <div className="queue-actions">⏵</div>
          </div>
        )}
        {nextItems.map(idx => {
          const t = tracks[idx];
          if (!t) return null;
          return (
            <div key={idx} className="queue-item" draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(idx)}
              onClick={() => { setCurrentIndex(idx); setIsPlaying(true); }}
            >
              <div className="queue-thumb"><img src={t.artwork || '/bgimage.jpg'} alt="" loading="lazy" /></div>
              <div className="queue-text">
                <div className="queue-title">{t.title}</div>
                <div className="queue-artist">{t.artist}</div>
              </div>
              <div className="queue-actions">⏭</div>
            </div>
          );
        })}
        {nextItems.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">⏭️</div>
            <div className="empty-title">Queue is empty</div>
            <div className="empty-text">Click a track to start playing.</div>
          </div>
        )}
      </div>
    </aside>
  );
}
