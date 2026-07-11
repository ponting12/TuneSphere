import { usePlayer } from '../context/PlayerContext';

export default function Toast() {
  const { toasts } = usePlayer();
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className="toast">
          <span>{t.emoji}</span><span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
