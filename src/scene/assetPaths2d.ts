import { assetUrl } from '../utils/assets';

const BASE = 'assets/2d';

export const ASSETS_2D = {
  board: {
    light: assetUrl(`${BASE}/board/square-light.svg`),
    dark: assetUrl(`${BASE}/board/square-dark.svg`),
  },
  pieces: {
    red: assetUrl(`${BASE}/pieces/piece-red.svg`),
    black: assetUrl(`${BASE}/pieces/piece-black.svg`),
    redKing: assetUrl(`${BASE}/pieces/piece-red-king.svg`),
    blackKing: assetUrl(`${BASE}/pieces/piece-black-king.svg`),
  },
  vfx: {
    explosion: assetUrl(`${BASE}/vfx/explosion-spritesheet.svg`),
  },
  ui: {
    buttonPrimary: assetUrl(`${BASE}/ui/button-primary.svg`),
    buttonSecondary: assetUrl(`${BASE}/ui/button-secondary.svg`),
    panel: assetUrl(`${BASE}/ui/panel.svg`),
  },
  icons: {
    bomb: assetUrl(`${BASE}/icons/bomb.svg`),
  },
} as const;

export function pieceAsset(color: 'red' | 'black', king: boolean): string {
  if (color === 'red') return king ? ASSETS_2D.pieces.redKing : ASSETS_2D.pieces.red;
  return king ? ASSETS_2D.pieces.blackKing : ASSETS_2D.pieces.black;
}
