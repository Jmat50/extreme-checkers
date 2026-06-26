/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAME_SERVER_URL?: string;
  readonly VITE_EDITOR_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
