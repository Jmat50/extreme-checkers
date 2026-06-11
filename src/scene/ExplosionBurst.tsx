import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { gridToWorld, SURFACE_EPSILON } from './boardCoords';
import { EXPLOSION_ASPECT, EXPLOSION_HEIGHT, EXPLOSION_SIZE, EXPLOSION_VIDEO } from './explosionVideo';

interface ExplosionBurstProps {
  row: number;
  col: number;
  onComplete: () => void;
}

export function ExplosionBurst({ row, col, onComplete }: ExplosionBurstProps) {
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null);
  const completedRef = useRef(false);

  useFrame(() => {
    if (texture) texture.needsUpdate = true;
  });

  useEffect(() => {
    completedRef.current = false;
    const video = document.createElement('video');
    video.src = EXPLOSION_VIDEO;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.loop = false;

    const map = new THREE.VideoTexture(video);
    map.colorSpace = THREE.SRGBColorSpace;
    map.minFilter = THREE.LinearFilter;
    map.magFilter = THREE.LinearFilter;

    const finish = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete();
    };

    const handleEnded = () => finish();
    const handleError = () => finish();

    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    setTexture(map);
    video.load();
    void video.play().catch(handleError);

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      map.dispose();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [onComplete, row, col]);

  const [x, y, z] = gridToWorld(row, col);

  if (!texture) return null;

  return (
    <Billboard position={[x, y + SURFACE_EPSILON + EXPLOSION_HEIGHT, z]} follow>
      <mesh renderOrder={10}>
        <planeGeometry args={[EXPLOSION_SIZE * EXPLOSION_ASPECT, EXPLOSION_SIZE]} />
        <meshBasicMaterial
          map={texture}
          transparent
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Billboard>
  );
}
