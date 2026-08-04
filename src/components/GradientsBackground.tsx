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

const RED_PALETTE: BlobPalette = {
  c1: [220, 45, 45],
  c2: [190, 35, 55],
  c3: [255, 70, 50],
  c4: [210, 25, 25],
  c5: [150, 35, 35],
  interactive: [205, 55, 45],
};

function applyPalette(palette: BlobPalette) {
  if (!palette?.c1) return;
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
    applyPalette(RED_PALETTE);
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
