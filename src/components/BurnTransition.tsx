import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { assetUrl } from '../utils/assets';
import './BurnTransition.css';

export const BURN_TRANSITION_MS = 1150;

interface BurnTransitionProps {
  onComplete: () => void;
}

export function BurnTransition({ onComplete }: BurnTransitionProps) {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reducedMotion ? 0 : BURN_TRANSITION_MS;
    const timer = window.setTimeout(onComplete, delay);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="burn-transition"
      style={
        {
          '--burn-glitter': `url("${assetUrl('assets/fire-glitter.png')}")`,
        } as CSSProperties
      }
      aria-hidden
    />
  );
}
