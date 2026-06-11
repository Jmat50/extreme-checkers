import { assetUrl } from '../utils/assets';

export const MODEL = {
  board: assetUrl('models/board.glb'),
  pieceRed: assetUrl('models/piece-red.glb'),
  pieceBlack: assetUrl('models/piece-black.glb'),
  pieceRedKing: assetUrl('models/piece-red-king.glb'),
  pieceBlackKing: assetUrl('models/piece-black-king.glb'),
} as const;

export const HDRI_STUDIO = assetUrl('hdri/studio.hdr');
