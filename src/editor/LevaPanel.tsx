import { useControls, button, Leva } from 'leva';
import { useConfigStore, type EditMode } from '../config/configStore';
import { copyConfigToClipboard, saveConfigToDisk } from './exportConfig';

export function LevaPanel() {
  const config = useConfigStore((s) => s.config);
  const setScene = useConfigStore((s) => s.setScene);
  const setAi = useConfigStore((s) => s.setAi);
  const setRules = useConfigStore((s) => s.setRules);
  const setEditMode = useConfigStore((s) => s.setEditMode);
  const resetConfig = useConfigStore((s) => s.resetConfig);
  const loadConfig = useConfigStore((s) => s.loadConfig);

  useControls(
    'Scene',
    {
      boardScale: {
        value: config.scene.boardScale,
        min: 0.5,
        max: 1.5,
        step: 0.01,
        onChange: (v) => setScene({ boardScale: v }),
      },
      pieceSizeRatio: {
        value: config.scene.pieceSizeRatio,
        min: 0.5,
        max: 1,
        step: 0.01,
        onChange: (v) => setScene({ pieceSizeRatio: v }),
      },
      highlightOpacity: {
        value: config.scene.highlightOpacity,
        min: 0.1,
        max: 0.9,
        step: 0.01,
        onChange: (v) => setScene({ highlightOpacity: v }),
      },
    },
    { collapsed: false },
  );

  useControls(
    'Markers',
    {
      bombIconScale: {
        value: config.scene.bombIconScale,
        min: 0.2,
        max: 1,
        step: 0.01,
        onChange: (v) => setScene({ bombIconScale: v }),
      },
    },
    { collapsed: true },
  );

  useControls(
    'VFX',
    {
      explosionSize: {
        value: config.scene.explosionSize,
        min: 0.3,
        max: 2.5,
        step: 0.01,
        onChange: (v) => setScene({ explosionSize: v }),
      },
      explosionDurationMs: {
        value: config.scene.explosionDurationMs,
        min: 200,
        max: 1500,
        step: 50,
        onChange: (v) => setScene({ explosionDurationMs: v }),
      },
      explosionFrameCount: {
        value: config.scene.explosionFrameCount,
        min: 3,
        max: 12,
        step: 1,
        onChange: (v) => setScene({ explosionFrameCount: v }),
      },
    },
    { collapsed: true },
  );

  useControls(
    'Rules',
    {
      editMode: {
        value: useConfigStore.getState().editMode,
        options: ['play', 'bombs', 'startRed', 'startBlack'] as EditMode[],
        onChange: (v) => setEditMode(v as EditMode),
      },
      allPiecesStartAsKings: {
        value: config.rules.allPiecesStartAsKings,
        onChange: (v) => setRules({ allPiecesStartAsKings: v }),
      },
      hazardCount: {
        value: config.rules.hazardSquares.length,
        editable: false,
      },
      startRedCount: {
        value: config.rules.startRed.length,
        editable: false,
      },
      startBlackCount: {
        value: config.rules.startBlack.length,
        editable: false,
      },
    },
    { collapsed: false },
  );

  useControls(
    'AI',
    {
      captureWeight: {
        value: config.ai.captureWeight,
        min: 0,
        max: 50,
        step: 1,
        onChange: (v) => setAi({ captureWeight: v }),
      },
      hazardPenalty: {
        value: config.ai.hazardPenalty,
        min: 0,
        max: 100,
        step: 1,
        onChange: (v) => setAi({ hazardPenalty: v }),
      },
      selfDestructPenalty: {
        value: config.ai.selfDestructPenalty,
        min: 0,
        max: 100,
        step: 1,
        onChange: (v) => setAi({ selfDestructPenalty: v }),
      },
    },
    { collapsed: true },
  );

  useControls(
    'Config',
    {
      'Save JSON': button(() => {
        void saveConfigToDisk(useConfigStore.getState().config);
      }),
      'Copy JSON': button(() => {
        void copyConfigToClipboard(useConfigStore.getState().config);
      }),
      'Import JSON': button(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              loadConfig(JSON.parse(String(reader.result)) as typeof config);
            } catch {
              alert('Invalid JSON file');
            }
          };
          reader.readAsText(file);
        };
        input.click();
      }),
      Reset: button(() => resetConfig()),
    },
    { collapsed: false },
  );

  return <Leva collapsed={false} oneLineLabels fill flat titleBar={{ title: 'Extreme Checkers Editor' }} />;
}
