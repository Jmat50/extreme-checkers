import { useCallback, useRef } from 'react';

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.08,
) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    setTimeout(() => ctx.close(), duration * 1000 + 100);
  } catch {
    // Audio not available
  }
}

export function useSound() {
  const winPlayed = useRef(false);

  const playMove = useCallback(() => playTone(320, 0.08, 'triangle'), []);
  const playCapture = useCallback(() => {
    playTone(180, 0.06, 'square', 0.1);
    setTimeout(() => playTone(240, 0.1, 'square', 0.08), 60);
  }, []);
  const playKing = useCallback(() => {
    playTone(520, 0.12, 'sine', 0.1);
    setTimeout(() => playTone(680, 0.15, 'sine', 0.08), 100);
  }, []);
  const playWin = useCallback(() => {
    if (winPlayed.current) return;
    winPlayed.current = true;
    [440, 554, 659, 880].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.2, 'sine', 0.1), i * 120);
    });
  }, []);

  return { playMove, playCapture, playKing, playWin };
}
