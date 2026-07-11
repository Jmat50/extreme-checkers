import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { assetUrl } from '../utils/assets';
import './BackgroundMusic.css';

/** 0 = OFF, 1–6 = track slots. */
export type MusicSelection = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const TRACK_COUNT = 6;
const POSITION_COUNT = TRACK_COUNT + 1; // OFF + tracks
const STEP_DEG = 360 / POSITION_COUNT;
/** Dial 0deg points at 3 o'clock; -90deg is 12 o'clock (OFF). */
const OFF_DEG = -90;

const TRACKS: { id: MusicSelection; label: string; src: string | null }[] = [
  { id: 0, label: 'OFF', src: null },
  { id: 1, label: '1', src: assetUrl('assets/audio/background.mp3') },
  { id: 2, label: '2', src: assetUrl('assets/audio/track-2-pocket-tanks.mp3') },
  { id: 3, label: '3', src: null },
  { id: 4, label: '4', src: null },
  { id: 5, label: '5', src: null },
  { id: 6, label: '6', src: null },
];

const STORAGE_KEY = 'extreme-checkers-music-selection';

function dialDegrees(selection: MusicSelection): number {
  return OFF_DEG + selection * STEP_DEG;
}

function readStoredSelection(): MusicSelection {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      // Migrate old on/off preference
      const legacy = localStorage.getItem('extreme-checkers-music-playing');
      if (legacy === 'false') return 0;
      return 1;
    }
    const n = Number(stored);
    if (Number.isInteger(n) && n >= 0 && n <= TRACK_COUNT) {
      return n as MusicSelection;
    }
  } catch {
    /* ignore */
  }
  return 1;
}

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selection, setSelection] = useState<MusicSelection>(readStoredSelection);

  const setSelectionState = useCallback((next: MusicSelection) => {
    setSelection(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
  }, []);

  const activeTrack = TRACKS[selection];
  const src = activeTrack?.src ?? null;
  const playing = src != null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!src) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      return;
    }

    audio.loop = true;

    if (audio.getAttribute('src') !== src) {
      audio.src = src;
      audio.load();
    }

    void audio.play().catch(() => setSelectionState(0));
  }, [src, setSelectionState]);

  useEffect(() => {
    const tryResume = () => {
      const stored = readStoredSelection();
      if (stored === 0) return;
      const track = TRACKS[stored];
      if (!track?.src) return;
      const audio = audioRef.current;
      if (!audio || !audio.paused) return;
      void audio.play().catch(() => setSelectionState(0));
    };
    window.addEventListener('pointerdown', tryResume, { once: true });
    return () => window.removeEventListener('pointerdown', tryResume);
  }, [setSelectionState]);

  return (
    <div
      className="music-knob"
      role="radiogroup"
      aria-label="Background music"
    >
      <audio ref={audioRef} loop preload="auto" />
      <div className="music-knob__clock clock-input" aria-hidden={!playing}>
        <div
          className="music-knob__dial dial"
          style={{ transform: `rotate(${dialDegrees(selection)}deg)` }}
        />
        {TRACKS.map((track) => {
          const angle = dialDegrees(track.id);
          return (
            <button
              key={track.id}
              type="button"
              role="radio"
              className={`music-knob__notch notch${selection === track.id ? ' music-knob__notch--active' : ''}`}
              style={
                {
                  '--n': track.id,
                  '--angle': `${angle}deg`,
                  '--label-angle': `${-angle}deg`,
                } as CSSProperties
              }
              aria-checked={selection === track.id}
              aria-label={
                track.id === 0
                  ? 'Music off'
                  : track.src
                    ? `Play track ${track.id}`
                    : `Track ${track.id} (coming soon)`
              }
              title={
                track.id === 0
                  ? 'Off'
                  : track.src
                    ? `Track ${track.id}`
                    : `Track ${track.id} — coming soon`
              }
              onClick={() => setSelectionState(track.id)}
            >
              <span className="music-knob__label">{track.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
