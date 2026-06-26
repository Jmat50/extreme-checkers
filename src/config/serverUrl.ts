/** Game server base URL (Render in production; Vite proxy in local dev). */
export function getGameServerUrl(): string {
  const configured = import.meta.env.VITE_GAME_SERVER_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;
  return window.location.origin;
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getGameServerUrl()}${normalized}`;
}

/** True when the build was wired to a remote game server (e.g. Render). */
export function isOnlineMultiplayerConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GAME_SERVER_URL?.trim());
}
