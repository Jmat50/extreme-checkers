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

/**
 * True when online multiplayer can be used:
 * - Production Pages builds with VITE_GAME_SERVER_URL, or
 * - Localhost / Vite proxy (dev:all) without an env var.
 */
export function isOnlineMultiplayerConfigured(): boolean {
  if (import.meta.env.VITE_GAME_SERVER_URL?.trim()) return true;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}
