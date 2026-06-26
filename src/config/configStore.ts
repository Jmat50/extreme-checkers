import { create, type StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  cloneConfig,
  DEFAULT_GAME_CONFIG,
  type GameConfig,
} from './gameConfig';
import { IS_EDITOR } from './editorMode';
import type { Position } from '../game/types';

export type EditMode = 'play' | 'bombs' | 'startRed' | 'startBlack';

interface ConfigState {
  config: GameConfig;
  editMode: EditMode;
  rulesVersion: number;
  setScene: (patch: Partial<GameConfig['scene']>) => void;
  setAi: (patch: Partial<GameConfig['ai']>) => void;
  setRules: (patch: Partial<GameConfig['rules']>) => void;
  setEditMode: (mode: EditMode) => void;
  resetConfig: () => void;
  loadConfig: (config: GameConfig) => void;
  toggleHazard: (row: number, col: number) => void;
  toggleStartRed: (row: number, col: number) => void;
  toggleStartBlack: (row: number, col: number) => void;
}

function togglePosition(list: Position[], row: number, col: number): Position[] {
  const idx = list.findIndex((p) => p.row === row && p.col === col);
  if (idx >= 0) return list.filter((_, i) => i !== idx);
  return [...list, { row, col }];
}

function bumpRules(set: (partial: Partial<ConfigState>) => void, config: GameConfig) {
  set({ config, rulesVersion: Date.now() });
}

const storeImpl: StateCreator<ConfigState> = (set, get) => ({
  config: cloneConfig(DEFAULT_GAME_CONFIG),
  editMode: 'play',
  rulesVersion: 0,

  setScene: (patch) =>
    set((s) => ({ config: { ...s.config, scene: { ...s.config.scene, ...patch } } })),

  setAi: (patch) =>
    set((s) => ({ config: { ...s.config, ai: { ...s.config.ai, ...patch } } })),

  setRules: (patch) => {
    const config = { ...get().config, rules: { ...get().config.rules, ...patch } };
    bumpRules(set, config);
  },

  setEditMode: (mode) => set({ editMode: mode }),

  resetConfig: () => set({ config: cloneConfig(DEFAULT_GAME_CONFIG), rulesVersion: Date.now() }),

  loadConfig: (config) => bumpRules(set, cloneConfig(config)),

  toggleHazard: (row, col) => {
    const rules = get().config.rules;
    bumpRules(set, {
      ...get().config,
      rules: {
        ...rules,
        hazardSquares: togglePosition(rules.hazardSquares, row, col),
      },
    });
  },

  toggleStartRed: (row, col) => {
    const rules = get().config.rules;
    bumpRules(set, {
      ...get().config,
      rules: {
        ...rules,
        startRed: togglePosition(rules.startRed, row, col),
      },
    });
  },

  toggleStartBlack: (row, col) => {
    const rules = get().config.rules;
    bumpRules(set, {
      ...get().config,
      rules: {
        ...rules,
        startBlack: togglePosition(rules.startBlack, row, col),
      },
    });
  },
});

export const useConfigStore = IS_EDITOR
  ? create<ConfigState>()(
      persist(storeImpl, {
        name: 'extreme-checkers-editor-config',
        partialize: (s) => ({ config: s.config }),
      }),
    )
  : create<ConfigState>()(storeImpl);

export function getGameConfig(): GameConfig {
  return useConfigStore.getState().config;
}
