# AGENTS

## Purpose

- 2D overhead checkers built with **boardgame.io**, React, and CSS Grid sprites (no Three.js).
- **Live client:** GitHub Pages — https://jmat50.github.io/extreme-checkers/
- **Game server:** Render free web service (`npm run start:server`) for online multiplayer.
- Keep this file focused on architecture and coding constraints. Put user-facing setup in `README.md` and deployment runbooks in `docs/DEPLOYMENT.md`.

## Runtime Shape

| Piece | Location | Notes |
|-------|----------|-------|
| React client | `src/` | Vite build; `boardgame.io` Local / AI / SocketIO transports |
| Game rules | `src/game/` | Shared between client and server — **must run in Node** |
| 2D board UI | `src/scene/Board2D.tsx` | CSS Grid squares + piece sprites; drag via `src/hooks/usePieceDrag.ts` |
| Lobby / shell | `src/components/Lobby.tsx`, `src/App.tsx` | Kenney UI assets |
| Game server | `server/index.ts` | boardgame.io `Server`, built-in `/games` Lobby API, Socket.IO |
| Online lobby UI | `src/components/OnlineLobby.tsx`, `src/lobby/` | `LobbyClient` list/create/join + credentials |
| Editor (dev only) | `src/editor/`, `electron/` | Leva panel; `VITE_EDITOR_MODE=true`; not shipped to Pages |

## Deployment

- **Pages:** `.github/workflows/deploy-pages.yml` builds with `BASE_PATH=/extreme-checkers/` and `VITE_GAME_SERVER_URL` from repo variable `GAME_SERVER_URL`.
- **Render:** `render.yaml` — `npm ci`, `npm run start:server`, health check `/api/health`.
- **One-click Render:** https://render.com/deploy?repo=https://github.com/Jmat50/extreme-checkers
- **Local dev:** `npm run dev:all` — Vite proxies `/api`, `/socket.io`, `/games` to port 8000 (`vite.config.ts`).

## Shared Client / Server Code

`server/index.ts` imports `CheckersGame` from `src/game/game.ts`, which pulls in `src/config/configStore.ts` and `src/config/editorMode.ts`.

- **Never read `import.meta.env` without optional chaining** in code the server imports. Node/tsx has no Vite env shim; use `import.meta.env?.FOO`.
- Prefer `DEFAULT_GAME_CONFIG` from `gameConfig.ts` for server-safe defaults; `getGameConfig()` uses zustand (works in Node when `IS_EDITOR` is false).
- Do not import React components, `serverUrl.ts`, or browser-only hooks from `server/` or `src/game/`.

## Gameplay UI

- **Click:** select piece → click highlighted green square.
- **Drag:** pointer-drag piece to a valid square (`usePieceDrag`); ghost preview + drop highlight.
- Move validation: `getValidMovesForSelection()` in `src/game/logic.ts` (forced captures, multi-jump).
- Editor play mode uses the same board; `editMode` toggles bomb/start-position painting.

## Key Files

- `src/game/game.ts` — boardgame.io game definition and moves
- `src/game/logic.ts` — board state, move generation, hazards
- `src/config/gameConfig.ts` — tunable rules/scene defaults
- `src/config/serverUrl.ts` — `VITE_GAME_SERVER_URL` for production client
- `src/lobby/lobbyClient.ts` — boardgame.io `LobbyClient` helpers
- `src/components/OnlineLobby.tsx` — public match browser / waiting room
- `src/client.tsx` — SocketIO server URL wiring
- `render.yaml` — Render blueprint

## Verification

```bash
npm run build          # client production build
npm run test:gh        # Pages build + path verification
npm run start:server   # game server (expect /api/health → {"ok":true})
npm run dev:all        # client + server for local multiplayer
```

## References

- `README.md` — modes, controls, editor, credits
- `docs/DEPLOYMENT.md` — Pages + Render setup and troubleshooting
