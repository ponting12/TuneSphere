import { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

/**
 * ThemeEffects
 * Renders theme-specific ambient visual effects:
 * - Dark mode: Canvas-based starfield twinkle particles + HTML aurora sweep
 * - Light mode: HTML sun rays + dust motes + warm gradient sweep
 *
 * Uses a hybrid approach: CSS-based layered effects + dynamic canvas particles
 * for rich, performant visual feedback.
 */
export default function ThemeEffects() {
  const { theme } = usePlayer();
  const canvasRef = useRef(null);
  const animRef  = useRef(null);
  const starsRef = useRef([]);

  // ── Canvas-based particle system (stars for dark, dust motes for light) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    const isDark = theme === 'dark';
    const count  = isDark ? 80 : 40;

    // Initialize particles
    const initParticles = () => {
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: isDark ? Math.random() * 2 + 0.5 : Math.random() * 4 + 2,
          speedX: (Math.random() - 0.5) * (isDark ? 0.02 : 0.04),
          speedY: (Math.random() - 0.5) * (isDark ? 0.01 : 0.03),
          opacity: Math.random() * 0.6 + 0.1,
          opacitySpeed: (Math.random() * 0.008 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
          phase: Math.random() * Math.PI * 2,
        });
      }
    };
    initParticles();

    // Handle resize
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Animation loop
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        // Update position
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around edges
        if (p.x > 105) p.x = -5;
        else if (p.x < -5) p.x = 105;
        if (p.y > 105) p.y = -5;
        else if (p.y < -5) p.y = 105;

        // Twinkle / fade
        p.opacity += p.opacitySpeed;
        if (p.opacity > 0.8 || p.opacity < 0.05) {
          p.opacitySpeed *= -1;
        }

        // Draw particle
        const x = (p.x / 100) * canvas.width;
        const y = (p.y / 100) * canvas.height;
        
        if (isDark) {
          // Stars: white dots with glow
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, p.size * 3);
          gradient.addColorStop(0, `rgba(255, 255, 255, ${p.opacity})`);
          gradient.addColorStop(0.3, `rgba(255, 255, 255, ${p.opacity * 0.3})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, p.size * 3, 0, Math.PI * 2);
          ctx.fill();

          // Core dot
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.9})`;
          ctx.beginPath();
          ctx.arc(x, y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Dust motes: warm golden dots
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, p.size * 2);
          gradient.addColorStop(0, `rgba(245, 158, 11, ${p.opacity * 0.4})`);
          gradient.addColorStop(0.5, `rgba(251, 191, 36, ${p.opacity * 0.15})`);
          gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();

          // Core
          ctx.fillStyle = `rgba(251, 191, 36, ${p.opacity * 0.3})`;
          ctx.beginPath();
          ctx.arc(x, y, p.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [theme]);

  return (
    <>
      {/* Canvas layer for particles */}
      <canvas
        ref={canvasRef}
        className="theme-effects-canvas"
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          width: '100vw',
          height: '100vh',
        }}
      />

      {/* Dark Mode: Aurora sweep overlay */}
      {theme === 'dark' && <div className="aurora-sweep" aria-hidden="true" />}

      {/* Light Mode: Warm sweep overlay + Sun rays + Dust motes */}
      {theme === 'light' && (
        <>
          <div className="warm-sweep" aria-hidden="true" />
          <div className="sunrays-container" aria-hidden="true">
            <div className="sunray" />
            <div className="sunray" />
            <div className="sunray" />
            <div className="sunray" />
            <div className="sunray" />
            <div className="sunray" />
            <div className="sunray" />
          </div>
        </>
      )}
    </>
  );
}

