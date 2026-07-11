import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { assetUrl } from '../utils/assets';
import './BackgroundMusic.css';

/** 0 = OFF, 1–2 = active tracks (layout still uses 7-slot angles). */
export type MusicSelection = 0 | 1 | 2;

/** Keep original 7-slot spacing so OFF/1/2 stay at the same angles. */
const LAYOUT_SLOT_COUNT = 7;
const STEP_DEG = 360 / LAYOUT_SLOT_COUNT;
/** Dial 0deg points at 3 o'clock; -90deg is 12 o'clock (OFF). */
const OFF_DEG = -90;

const TRACKS: { id: MusicSelection; label: string; src: string | null }[] = [
  { id: 0, label: 'OFF', src: null },
  { id: 1, label: '1', src: assetUrl('assets/audio/background.mp3') },
  { id: 2, label: '2', src: assetUrl('assets/audio/track-2-pocket-tanks.mp3') },
];

const SELECTION_ORDER: MusicSelection[] = [0, 1, 2];

const STORAGE_KEY = 'extreme-checkers-music-selection';

function dialDegrees(selection: MusicSelection): number {
  return OFF_DEG + selection * STEP_DEG;
}

function nextSelection(current: MusicSelection): MusicSelection {
  const idx = SELECTION_ORDER.indexOf(current);
  return SELECTION_ORDER[(idx + 1) % SELECTION_ORDER.length];
}

function readStoredSelection(): MusicSelection {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      const legacy = localStorage.getItem('extreme-checkers-music-playing');
      if (legacy === 'false') return 0;
      return 1;
    }
    const n = Number(stored);
    if (n === 0 || n === 1 || n === 2) return n;
    // Old 3–6 selections fall back to track 1
    if (Number.isInteger(n) && n >= 3 && n <= 6) return 1;
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

  const advance = useCallback(() => {
    setSelectionState(nextSelection(selection));
  }, [selection, setSelectionState]);

  const activeTrack = TRACKS.find((t) => t.id === selection) ?? TRACKS[0];
  const src = activeTrack.src;

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
      const track = TRACKS.find((t) => t.id === stored);
      if (!track?.src) return;
      const audio = audioRef.current;
      if (!audio || !audio.paused) return;
      void audio.play().catch(() => setSelectionState(0));
    };
    window.addEventListener('pointerdown', tryResume, { once: true });
    return () => window.removeEventListener('pointerdown', tryResume);
  }, [setSelectionState]);

  const currentLabel =
    selection === 0 ? 'Music off' : `Track ${selection}`;

  return (
    <div className="music-knob">
      <audio ref={audioRef} loop preload="auto" />
      <button
        type="button"
        className="music-knob__clock clock-input"
        onClick={advance}
        aria-label={`Background music: ${currentLabel}. Click for next.`}
        title={`${currentLabel} — click for next`}
      >
        <div
          className="music-knob__dial dial"
          style={{ transform: `rotate(${dialDegrees(selection)}deg)` }}
          aria-hidden
        />
        {TRACKS.map((track) => {
          const angle = dialDegrees(track.id);
          return (
            <span
              key={track.id}
              className={`music-knob__notch notch${selection === track.id ? ' music-knob__notch--active' : ''}`}
              style={
                {
                  '--n': track.id,
                  '--angle': `${angle}deg`,
                  '--label-angle': `${-angle}deg`,
                } as CSSProperties
              }
              aria-hidden
            >
              <span className="music-knob__label">{track.label}</span>
            </span>
          );
        })}
      </button>
    </div>
  );
}
