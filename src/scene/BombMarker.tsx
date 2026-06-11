import { useTexture } from '@react-three/drei';
import { assetUrl } from '../utils/assets';
import { gridToWorld } from './boardCoords';

const BOMB_TEXTURE = assetUrl('icons/bomb.png');

export function BombMarker({ row, col }: { row: number; col: number }) {
  const texture = useTexture(BOMB_TEXTURE);
  const [x, y, z] = gridToWorld(row, col);

  return (
    <mesh position={[x, y + 0.08, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.55, 0.55]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.1} depthWrite={false} />
    </mesh>
  );
}

useTexture.preload(BOMB_TEXTURE);
