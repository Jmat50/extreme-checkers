# Extreme Checkers

2D overhead checkers built with [boardgame.io](https://boardgame.io), React, and CSS Grid sprites.

**Live demo:** https://jmat50.github.io/extreme-checkers/

| Mode | GitHub Pages demo |
|------|-------------------|
| Local 2-player | Yes |
| vs AI | Yes |
| Online multiplayer | Yes — via [Render](https://render.com) game server ([setup guide](docs/DEPLOYMENT.md)) |

## How to play

- **Drag** your piece to a green highlighted square, or **click** a piece then click a destination.
- Valid moves are highlighted in green; forced captures apply when available.
- Bomb squares eliminate any piece that lands on them.

## Deployment (GitHub Pages + Render)

The live demo is split across two free hosts:

- **Client** — GitHub Pages (this repo’s Actions workflow)
- **Server** — Render free web service (`npm run start:server`)

Full step-by-step instructions: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

Quick checklist:

1. Deploy on Render — **[one-click deploy](https://render.com/deploy?repo=https://github.com/Jmat50/extreme-checkers)** or use [`render.yaml`](render.yaml) blueprint
2. Verify `https://extreme-checkers-api.onrender.com/api/health` returns `{"ok":true}`
3. Set GitHub repo variable `GAME_SERVER_URL` to that URL (no trailing slash) if not already set
4. Push to `main` — Pages rebuild picks up the server URL

If Render deploy fails on startup, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#5-troubleshooting).

## Windows visual editor

Tune board scale, piece size, VFX, AI weights, bomb squares, and starting positions with a live 2D WYSIWYG editor (Leva + click-to-edit board). Dev-only — not included in the GitHub Pages game build.

### Run editor (development)

```bash
npm install
npm run editor
```

Opens an Electron window with the 2D board and control panel. Alternatively, double-click `scripts/launch-editor.bat` (requires Node.js; opens browser + Vite dev server).

**Edit rules:** In the Leva panel, set **Rules → editMode** to `bombs`, `startRed`, or `startBlack`, then click dark squares on the board. Switch back to `play` to test moves.

**Save:** Use **Config → Save JSON** or `Ctrl+S` (Electron) to export `gameConfig.json`. Copy values into `src/config/gameConfig.ts` defaults when ready to ship.

### Build portable Windows `.exe`

```bash
npm run build:editor:win
```

Output: `release/Extreme Checkers Editor.exe` (portable, no installer). First launch may show Windows SmartScreen for unsigned dev tools — choose “Run anyway”.

## Run locally

```bash
npm install
npm run dev:all          # starts game server + Vite client
```

- Client: http://localhost:5173
- Server: http://localhost:8000

Online multiplayer works locally without Render — the Vite dev server proxies `/api`, `/socket.io`, and `/games` to port 8000.

Optional: copy [`.env.example`](.env.example) to `.env.local` and set `VITE_GAME_SERVER_URL` to test the production client against your Render deployment.

## Modes

- **Local 2-Player** — hot-seat on one machine (drag or click to move)
- **Play vs AI** — offline with boardgame.io bot
- **Online Multiplayer Lobby** — public match browser via boardgame.io Lobby API + Socket.IO (Render in production, local server in dev). Create a public match for others to join from the list, or create a private match and share its match ID.

## Project layout

| Path | Role |
|------|------|
| `src/game/` | Rules, board state, AI — shared with server |
| `src/scene/` | 2D board, pieces, VFX sprites |
| `src/hooks/usePieceDrag.ts` | Drag-and-drop movement |
| `server/index.ts` | Multiplayer server (boardgame.io Lobby + Socket.IO) |
| `src/lobby/` | LobbyClient helpers for public match list/create/join |
| `docs/DEPLOYMENT.md` | Full Pages + Render guide |
| `AGENTS.md` | Architecture notes for coding agents |

## Assets

2D sprites live in `public/assets/2d/` (board tiles, pieces, UI, VFX). See `public/assets/2d/ATTRIBUTION.md` for credits.

## Credits

### Art

- [Kenney UI Pack](https://kenney.nl/assets/ui-pack) (CC0) — lobby buttons and panels
- [Kenney Boardgame Pack](https://kenney.nl/assets/boardgame-pack) (CC0) — reference vectors
- Project-authored SVG board, pieces, and explosion VFX (CC0)
- Bomb hazard icon in `public/icons/bomb.svg`

### Open-source libraries

- [boardgame.io](https://boardgame.io/) — game state, turns, multiplayer, and AI
- [React](https://react.dev/) — UI
- [Vite](https://vitejs.dev/) — build tooling
- [Socket.IO](https://socket.io/) — real-time transport (via boardgame.io client)
- [Leva](https://github.com/pmndrs/leva) — editor control panel
- [Render](https://render.com/) — free game server hosting for online play
