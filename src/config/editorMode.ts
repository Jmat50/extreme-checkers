/** Safe in Vite (browser) and Node (Render game server via tsx). */
export const IS_EDITOR = import.meta.env?.VITE_EDITOR_MODE === 'true';
