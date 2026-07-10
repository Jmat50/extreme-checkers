import { useEffect, useRef } from 'react';
import './GradientsBackground.css';

type Rgb = [number, number, number];

type BlobPalette = {
  c1: Rgb;
  c2: Rgb;
  c3: Rgb;
  c4: Rgb;
  c5: Rgb;
  interactive: Rgb;
};

const START_PALETTE: BlobPalette = {
  c1: [18, 113, 255],
  c2: [221, 74, 255],
  c3: [100, 220, 255],
  c4: [200, 50, 50],
  c5: [180, 180, 50],
  interactive: [140, 100, 255],
};

const RED_PALETTE: BlobPalette = {
  c1: [220, 45, 45],
  c2: [190, 35, 55],
  c3: [255, 70, 50],
  c4: [210, 25, 25],
  c5: [150, 35, 35],
  interactive: [205, 55, 45],
};

const ORANGE_PALETTE: BlobPalette = {
  c1: [255, 120, 35],
  c2: [255, 90, 20],
  c3: [255, 165, 55],
  c4: [225, 100, 30],
  c5: [200, 85, 25],
  interactive: [255, 130, 45],
};

const GREEN_PALETTE: BlobPalette = {
  c1: [45, 185, 75],
  c2: [35, 165, 60],
  c3: [65, 205, 95],
  c4: [55, 145, 50],
  c5: [85, 205, 85],
  interactive: [55, 185, 75],
};

const PHASE_MS = 3 * 60 * 1000;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpRgb(from: Rgb, to: Rgb, t: number): Rgb {
  return [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)];
}

function lerpPalette(from: BlobPalette, to: BlobPalette, t: number): BlobPalette {
  return {
    c1: lerpRgb(from.c1, to.c1, t),
    c2: lerpRgb(from.c2, to.c2, t),
    c3: lerpRgb(from.c3, to.c3, t),
    c4: lerpRgb(from.c4, to.c4, t),
    c5: lerpRgb(from.c5, to.c5, t),
    interactive: lerpRgb(from.interactive, to.interactive, t),
  };
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function paletteAtTime(elapsedMs: number): BlobPalette {
  if (elapsedMs < PHASE_MS) {
    return lerpPalette(START_PALETTE, RED_PALETTE, easeInOut(elapsedMs / PHASE_MS));
  }

  const loopElapsed = elapsedMs - PHASE_MS;
  const cycleMs = PHASE_MS * 3;
  const cycleT = (loopElapsed % cycleMs) / PHASE_MS;
  const palettes = [RED_PALETTE, ORANGE_PALETTE, GREEN_PALETTE];
  const fromIndex = Math.floor(cycleT) % palettes.length;
  const toIndex = (fromIndex + 1) % palettes.length;
  const localT = easeInOut(cycleT - Math.floor(cycleT));
  return lerpPalette(palettes[fromIndex], palettes[toIndex], localT);
}

function applyPalette(palette: BlobPalette) {
  const root = document.documentElement;
  root.style.setProperty('--gradient-color1', palette.c1.join(', '));
  root.style.setProperty('--gradient-color2', palette.c2.join(', '));
  root.style.setProperty('--gradient-color3', palette.c3.join(', '));
  root.style.setProperty('--gradient-color4', palette.c4.join(', '));
  root.style.setProperty('--gradient-color5', palette.c5.join(', '));
  root.style.setProperty('--gradient-color-interactive', palette.interactive.join(', '));
}

export function GradientsBackground() {
  const interactiveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const startedAt = performance.now();
    let colorFrame = 0;

    const tickColors = (now: number) => {
      applyPalette(paletteAtTime(now - startedAt));
      colorFrame = requestAnimationFrame(tickColors);
    };

    colorFrame = requestAnimationFrame(tickColors);
    return () => cancelAnimationFrame(colorFrame);
  }, []);

  useEffect(() => {
    const interBubble = interactiveRef.current;
    if (!interBubble) return undefined;

    let curX = 0;
    let curY = 0;
    let tgX = 0;
    let tgY = 0;
    let frame = 0;

    const move = () => {
      curX += (tgX - curX) / 40;
      curY += (tgY - curY) / 40;
      interBubble.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
      frame = requestAnimationFrame(move);
    };

    const onMouseMove = (event: MouseEvent) => {
      tgX = event.clientX;
      tgY = event.clientY;
    };

    window.addEventListener('mousemove', onMouseMove);
    frame = requestAnimationFrame(move);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="gradient-bg" aria-hidden>
      <svg xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className="gradients-container">
        <div className="g1" />
        <div className="g2" />
        <div className="g3" />
        <div className="g4" />
        <div className="g5" />
        <div className="interactive" ref={interactiveRef} />
      </div>
    </div>
  );
}
