import { useEffect, useState } from 'react';
import { EVENTUALLY_BG_IMAGES } from '../utils/eventuallyAssets';
import './EventuallyBackground.css';

const SLIDE_DELAY_MS = 6000;

export function EventuallyBackground() {
  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 100);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (EVENTUALLY_BG_IMAGES.length <= 1) return undefined;

    const id = window.setInterval(() => {
      setPos((p) => (p + 1) % EVENTUALLY_BG_IMAGES.length);
    }, SLIDE_DELAY_MS);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      id="bg"
      className={ready ? 'eventually-bg eventually-bg--ready' : 'eventually-bg'}
      aria-hidden
    >
      {EVENTUALLY_BG_IMAGES.map((src, i) => {
        const isVisible = i === pos;
        const isTop = i === pos;
        return (
          <div
            key={src}
            className={[
              isVisible ? 'visible' : '',
              isTop ? 'top' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ backgroundImage: `url("${src}")`, backgroundPosition: 'center' }}
          />
        );
      })}
      <div className="eventually-bg__overlay" />
    </div>
  );
}
