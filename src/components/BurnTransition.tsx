import { useCallback, useEffect, useRef } from 'react';
import { assetUrl } from '../utils/assets';
import './BurnTransition.css';

const FIREBALL_SRC = assetUrl('assets/video/fireball-transition.mp4');
/** Fallback if the video fails to load or never ends. */
const FALLBACK_MS = 8000;

interface BurnTransitionProps {
  onComplete: () => void;
}

export function BurnTransition({ onComplete }: BurnTransitionProps) {
  const completedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      finish();
      return undefined;
    }

    const video = videoRef.current;
    const fallback = window.setTimeout(finish, FALLBACK_MS);

    if (!video) {
      return () => clearTimeout(fallback);
    }

    const onEnded = () => finish();
    const onError = () => finish();

    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    video.currentTime = 0;
    // Started from a game-start click; try with sound, fall back to muted autoplay.
    void video.play().catch(() => {
      video.muted = true;
      void video.play().catch(() => finish());
    });

    return () => {
      clearTimeout(fallback);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    };
  }, [finish]);

  return (
    <div className="burn-transition" aria-hidden>
      <video
        ref={videoRef}
        className="burn-transition__video"
        src={FIREBALL_SRC}
        playsInline
        preload="auto"
      />
    </div>
  );
}
