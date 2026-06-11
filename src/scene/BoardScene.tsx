import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  OrbitControls,
  useGLTF,
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CheckersState, Move } from '../game/types';
import { HAZARD_SQUARES } from '../game/logic';
import { gridToWorld, worldToGrid } from './boardCoords';
import { boardMaterial, redMaterial, blackMaterial } from './materials';
import { HDRI_STUDIO, MODEL } from './modelPaths';
import { BombMarker } from './BombMarker';

interface BoardSceneProps {
  G: CheckersState;
  onSelectSquare: (row: number, col: number) => void;
  interactive: boolean;
}

function AnimatedPiece({
  row,
  col,
  color,
  king,
  isSelected,
  isTarget,
}: {
  row: number;
  col: number;
  color: 'red' | 'black';
  king: boolean;
  isSelected: boolean;
  isTarget: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [target, setTarget] = useState(() => new THREE.Vector3(...gridToWorld(row, col)));
  const modelPath = king
    ? color === 'red'
      ? MODEL.pieceRedKing
      : MODEL.pieceBlackKing
    : color === 'red'
      ? MODEL.pieceRed
      : MODEL.pieceBlack;
  const { scene } = useGLTF(modelPath);
  const material = color === 'red' ? redMaterial : blackMaterial;

  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!mesh.name.includes('Torus') && !mesh.geometry?.type?.includes('Torus')) {
          mesh.material = material;
        }
      }
    });
    return c;
  }, [scene, material]);

  useEffect(() => {
    const [x, y, z] = gridToWorld(row, col);
    setTarget(new THREE.Vector3(x, y, z));
  }, [row, col]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.position.lerp(target, Math.min(1, delta * 8));
    const scale = isSelected ? 1.08 : 1;
    groupRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), delta * 6);
  });

  return (
    <group ref={groupRef} position={gridToWorld(row, col)}>
      <primitive object={clone} scale={0.85} />
      {isTarget && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.25, 0.35, 32]} />
          <meshBasicMaterial color="#44ff88" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

function HighlightSquare({ row, col, color }: { row: number; col: number; color: string }) {
  const [x, , z] = gridToWorld(row, col);
  return (
    <mesh position={[x, 0.06, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.85, 0.85]} />
      <meshBasicMaterial color={color} transparent opacity={0.45} />
    </mesh>
  );
}

function BoardMesh({ onPointerDown }: { onPointerDown: (e: ThreeEvent<PointerEvent>) => void }) {
  const { scene } = useGLTF(MODEL.board);
  const board = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = boardMaterial;
      }
    });
    return c;
  }, [scene]);

  return (
    <group onPointerDown={onPointerDown}>
      <primitive object={board} />
    </group>
  );
}

function Table() {
  return (
    <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[14, 14]} />
      <meshStandardMaterial color="#3d2b1f" roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

export function BoardScene({ G, onSelectSquare, interactive }: BoardSceneProps) {
  const validTargets = new Set(G.validMoves.map((m: Move) => `${m.to.row},${m.to.col}`));

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    const grid = worldToGrid(e.point.x, e.point.z);
    if (grid) onSelectSquare(grid.row, grid.col);
  };

  return (
    <>
      <color attach="background" args={['#1a1410']} />
      <fog attach="fog" args={['#1a1410', 12, 28]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <Environment files={HDRI_STUDIO} background={false} />
      <OrbitControls
        makeDefault
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={6}
        maxDistance={16}
        target={[0, 0, 0]}
      />
      <Table />
      <BoardMesh onPointerDown={handlePointerDown} />
      <ContactShadows position={[0, -0.11, 0]} opacity={0.5} scale={12} blur={2} />

      {G.selected && (
        <HighlightSquare
          row={G.selected.row}
          col={G.selected.col}
          color="#ffcc00"
        />
      )}
      {G.validMoves.map((m) => (
        <HighlightSquare key={`${m.to.row},${m.to.col}`} row={m.to.row} col={m.to.col} color="#44ff88" />
      ))}

      {HAZARD_SQUARES.map(({ row, col }) => (
        <BombMarker key={`bomb-${row}-${col}`} row={row} col={col} />
      ))}

      {G.board.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null;
          const key = `${r},${c}`;
          return (
            <AnimatedPiece
              key={key}
              row={r}
              col={c}
              color={cell.color}
              king={cell.king}
              isSelected={G.selected?.row === r && G.selected?.col === c}
              isTarget={validTargets.has(key)}
            />
          );
        }),
      )}

      <EffectComposer>
        <Bloom intensity={0.15} luminanceThreshold={0.9} />
        <Vignette eskil offset={0.2} darkness={0.6} />
      </EffectComposer>
    </>
  );
}
