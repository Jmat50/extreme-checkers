import type { GameConfig } from '../config/gameConfig';

declare global {
  interface Window {
    editorApi?: {
      saveConfig: (json: string) => Promise<string | null>;
    };
  }
}

export async function saveConfigToDisk(config: GameConfig): Promise<boolean> {
  const json = JSON.stringify(config, null, 2);

  if (window.editorApi?.saveConfig) {
    const path = await window.editorApi.saveConfig(json);
    return path !== null;
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'gameConfig.json';
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function copyConfigToClipboard(config: GameConfig): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
}
