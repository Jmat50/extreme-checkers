import { useTexture } from '@react-three/drei';
import { assetUrl } from '../utils/assets';
import { gridToWorld, SURFACE_EPSILON } from './boardCoords';

const BOMB_TEXTURE = assetUrl('icons/bomb.png');

export function BombMarker({ row, col }: { row: number; col: number }) {
  const texture = useTexture(BOMB_TEXTURE);
  const [x, , z] = gridToWorld(row, col);

  return (
    <mesh position={[x, SURFACE_EPSILON, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.55, 0.55]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.1} depthWrite={false} />
    </mesh>
  );
}

useTexture.preload(BOMB_TEXTURE);
