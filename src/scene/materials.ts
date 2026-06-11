import * as THREE from 'three';
import { assetUrl } from '../utils/assets';

const textureLoader = new THREE.TextureLoader();

function loadPBR(
  base: string,
  maps: { map?: string; normalMap?: string; roughnessMap?: string; metalnessMap?: string },
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff' });
  if (maps.map) {
    mat.map = textureLoader.load(base + maps.map);
    mat.map.colorSpace = THREE.SRGBColorSpace;
  }
  if (maps.normalMap) mat.normalMap = textureLoader.load(base + maps.normalMap);
  if (maps.roughnessMap) mat.roughnessMap = textureLoader.load(base + maps.roughnessMap);
  if (maps.metalnessMap) mat.metalnessMap = textureLoader.load(base + maps.metalnessMap);
  return mat;
}

export const boardMaterial = loadPBR(assetUrl('textures/board/'), {
  map: 'CheckerBoard_Board_BaseColor.png',
  normalMap: 'CheckerBoard_Board_Normal.png',
  roughnessMap: 'CheckerBoard_Board_Roughness.png',
  metalnessMap: 'CheckerBoard_Board_Metallic.png',
});

export const redMaterial = loadPBR(assetUrl('textures/red/'), {
  map: 'CheckerBoard_Red_BaseColor.png',
  normalMap: 'CheckerBoard_Red_Normal.png',
  roughnessMap: 'CheckerBoard_Red_Roughness.png',
  metalnessMap: 'CheckerBoard_Red_Metallic.png',
});

export const blackMaterial = loadPBR(assetUrl('textures/black/'), {
  map: 'CheckerBoard_Black_BaseColor.png',
  normalMap: 'CheckerBoard_Black_Normal.png',
  roughnessMap: 'CheckerBoard_Black_Roughness.png',
  metalnessMap: 'CheckerBoard_Black_Metallic.png',
});
