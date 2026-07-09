import type { Position } from '../game/types';

export interface GameConfig {
  scene: {
    boardScale: number;
    pieceSizeRatio: number;
    highlightOpacity: number;
    bombIconScale: number;
    explosionSize: number;
    explosionDurationMs: number;
    explosionFrameCount: number;
  };
  rules: {
    hazardSquares: Position[];
    startRed: Position[];
    startBlack: Position[];
    allPiecesStartAsKings: boolean;
  };
  ai: {
    captureWeight: number;
    hazardPenalty: number;
    selfDestructPenalty: number;
  };
}

const DEFAULT_HAZARDS: Position[] = [
  { row: 0, col: 1 },
  { row: 0, col: 3 },
  { row: 0, col: 5 },
  { row: 0, col: 7 },
  { row: 1, col: 0 },
  { row: 2, col: 7 },
  { row: 3, col: 0 },
  { row: 4, col: 7 },
  { row: 5, col: 0 },
  { row: 6, col: 2 },
  { row: 6, col: 4 },
  { row: 6, col: 7 },
  { row: 7, col: 0 },
  { row: 7, col: 2 },
  { row: 7, col: 4 },
  { row: 7, col: 6 },
];

const DEFAULT_START_RED: Position[] = [
  { row: 1, col: 2 },
  { row: 1, col: 4 },
  { row: 1, col: 6 },
  { row: 2, col: 1 },
  { row: 2, col: 3 },
];

const DEFAULT_START_BLACK: Position[] = [
  { row: 6, col: 1 },
  { row: 6, col: 3 },
  { row: 6, col: 5 },
  { row: 5, col: 2 },
  { row: 5, col: 4 },
];

export const DEFAULT_GAME_CONFIG: GameConfig = {
  scene: {
    boardScale: 1,
    pieceSizeRatio: 0.82,
    highlightOpacity: 0.45,
    bombIconScale: 0.55,
    explosionSize: 1.05,
    explosionDurationMs: 500,
    explosionFrameCount: 5,
  },
  rules: {
    hazardSquares: DEFAULT_HAZARDS.map((p) => ({ ...p })),
    startRed: DEFAULT_START_RED.map((p) => ({ ...p })),
    startBlack: DEFAULT_START_BLACK.map((p) => ({ ...p })),
    allPiecesStartAsKings: true,
  },
  ai: {
    captureWeight: 10,
    hazardPenalty: 40,
    selfDestructPenalty: 50,
  },
};

export function cloneConfig(config: GameConfig): GameConfig {
  return JSON.parse(JSON.stringify(config)) as GameConfig;
}

export function configRulesKey(config: GameConfig): string {
  return JSON.stringify(config.rules);
}
