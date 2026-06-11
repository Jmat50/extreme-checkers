/**
 * Converts CheckerBoard.fbx into separate GLB files for web use.
 * Run: npm run convert-models
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import {
  Box3,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  TorusGeometry,
  Vector3,
} from 'three';

// GLTFExporter expects browser FileReader in Node
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    result: ArrayBuffer | null = null;
    onloadend: (() => void) | null = null;
    readAsArrayBuffer(blob: Blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        this.onloadend?.();
      });
    }
  } as unknown as typeof FileReader;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const modelsDir = path.join(root, 'assets', 'models');
const publicModels = path.join(root, 'public', 'models');

fs.mkdirSync(publicModels, { recursive: true });

function findMesh(group: Object3D, predicate: (name: string) => boolean): Object3D | null {
  let found: Object3D | null = null;
  group.traverse((child) => {
    if (!found && child.name && predicate(child.name)) {
      found = child;
    }
  });
  return found;
}

function cloneMesh(mesh: Object3D): Object3D {
  const clone = mesh.clone(true);
  const box = new Box3().setFromObject(clone);
  const center = box.getCenter(new Vector3());
  clone.position.sub(center);
  return clone;
}

function exportGlb(object: Object3D, filename: string): Promise<void> {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      object,
      (result) => {
        const buffer = result as ArrayBuffer;
        fs.writeFileSync(path.join(publicModels, filename), Buffer.from(buffer));
        console.log(`Exported ${filename}`);
        resolve();
      },
      (error) => reject(error),
      { binary: true },
    );
  });
}

function createKingPiece(basePiece: Object3D, color: 'red' | 'black'): Object3D {
  const group = new Group();
  const piece = cloneMesh(basePiece);
  group.add(piece);

  const crownMat = new MeshStandardMaterial({
    color: color === 'red' ? '#ffd700' : '#c0c0c0',
    metalness: 0.9,
    roughness: 0.2,
    emissive: color === 'red' ? '#442200' : '#222222',
    emissiveIntensity: 0.15,
  });

  const box = new Box3().setFromObject(piece);
  const size = box.getSize(new Vector3());
  const topY = box.max.y;

  const ring = new Mesh(new TorusGeometry(size.x * 0.35, size.x * 0.04, 8, 24), crownMat);
  ring.position.y = topY + size.y * 0.05;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const gem = new Mesh(new CylinderGeometry(size.x * 0.12, size.x * 0.12, size.y * 0.08, 16), crownMat);
  gem.position.y = topY + size.y * 0.12;
  group.add(gem);

  return group;
}

async function main() {
  const loader = new OBJLoader();
  const objPath = path.join(modelsDir, 'CheckerBoard.obj');
  console.log('Loading', objPath);
  const text = fs.readFileSync(objPath, 'utf8');
  const scene = loader.parse(text);

  const board = findMesh(scene, (n) => n.includes('Board'));
  const redPiece = findMesh(scene, (n) => n === 'Red_Cylinder' || n.startsWith('Red'));
  const blackPiece = findMesh(scene, (n) => n === 'Black_Cylinder' || n.startsWith('Black'));

  if (!board || !redPiece || !blackPiece) {
    throw new Error('Could not find board or piece meshes in FBX');
  }

  await exportGlb(cloneMesh(board), 'board.glb');
  await exportGlb(cloneMesh(redPiece), 'piece-red.glb');
  await exportGlb(cloneMesh(blackPiece), 'piece-black.glb');
  await exportGlb(createKingPiece(redPiece, 'red'), 'piece-red-king.glb');
  await exportGlb(createKingPiece(blackPiece, 'black'), 'piece-black-king.glb');

  console.log('Done — GLBs written to public/models/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
