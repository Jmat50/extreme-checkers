import { useCallback, useEffect, useRef, useState } from 'react';
import { assetUrl } from '../utils/assets';
import './BackgroundMusic.css';

const MUSIC_SRC = assetUrl('assets/audio/background.mp3');
const STORAGE_KEY = 'extreme-checkers-music-playing';

function readStoredPlaying(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'false') return false;
    if (stored === 'true') return true;
  } catch {
    /* ignore */
  }
  return true;
}

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(readStoredPlaying);

  const setPlayingState = useCallback((next: boolean) => {
    setPlaying(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setPlayingState(!playing);
  }, [playing, setPlayingState]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      void audio.play().catch(() => setPlayingState(false));
    } else {
      audio.pause();
    }
  }, [playing, setPlayingState]);

  useEffect(() => {
    const tryResume = () => {
      if (!readStoredPlaying()) return;
      const audio = audioRef.current;
      if (!audio || !audio.paused) return;
      void audio.play().catch(() => setPlayingState(false));
    };
    window.addEventListener('pointerdown', tryResume, { once: true });
    return () => window.removeEventListener('pointerdown', tryResume);
  }, [setPlayingState]);

  return (
    <>
      <audio ref={audioRef} src={MUSIC_SRC} loop preload="auto" />
      <button
        type="button"
        className="background-music-toggle"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? 'Stop background music' : 'Play background music'}
        title={playing ? 'Stop music' : 'Play music'}
      >
        <span className="background-music-toggle__icon" aria-hidden>
          {playing ? '⏸' : '▶'}
        </span>
        <span className="background-music-toggle__label">{playing ? 'On' : 'Off'}</span>
      </button>
    </>
  );
}
