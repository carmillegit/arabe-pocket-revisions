// Fin de séance : « أَحْسَنْت » (bravo) ou « مَبْرُوك » (félicitations) si tout est juste.
// Formules sans marque de genre à l'écrit (forme de pause), pour toute la classe.
import { useEffect, useMemo, useRef } from 'preact/hooks';

const COLORS = ['var(--accent)', 'var(--sun)', 'var(--m-en_cours)', 'var(--m-acquis)', 'var(--m-nouveau)'];

export function Celebration({ ok, total, onClose }: { ok: number; total: number; onClose: () => void }) {
  const perfect = total > 0 && ok === total;
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => btn.current?.focus(), []);

  // Confettis en CSS pur (désactivés si l'utilisateur réduit les animations).
  const confetti = useMemo(
    () =>
      Array.from({ length: perfect ? 36 : 18 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.6 + Math.random() * 1.2,
        rotate: Math.random() * 360,
        color: COLORS[i % COLORS.length],
      })),
    [perfect],
  );

  return (
    <div class="celebrate" role="dialog" aria-modal="true" aria-labelledby="celebrate-title" onClick={onClose}>
      <div class="confetti" aria-hidden="true">
        {confetti.map((c, i) => (
          <span
            key={i}
            style={{
              left: `${c.left}%`,
              background: c.color,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              transform: `rotate(${c.rotate}deg)`,
            }}
          />
        ))}
      </div>
      <div class="celebrate-card" onClick={(e) => e.stopPropagation()}>
        <p class="celebrate-emoji" aria-hidden="true">{perfect ? '🏆' : '🎉'}</p>
        <bdi class="ar celebrate-ar" lang="ar" dir="rtl">
          {perfect ? 'مَبْرُوك' : 'أَحْسَنْت'}
        </bdi>
        <p class="translit">{perfect ? 'mabrūk' : 'aḥsant'}</p>
        <h2 id="celebrate-title" class="celebrate-title">
          {perfect ? 'Félicitations, sans faute !' : 'Bravo, séance terminée !'}
        </h2>
        <p class="muted">
          {ok} / {total} bonne{ok > 1 ? 's' : ''} réponse{ok > 1 ? 's' : ''}
        </p>
        <button ref={btn} type="button" class="btn btn-primary btn-block" onClick={onClose}>
          Continuer
        </button>
      </div>
    </div>
  );
}
