# Extreme Checkers

2D overhead checkers built with [boardgame.io](https://boardgame.io), React, and CSS Grid sprites.

**Live demo:** https://jmat50.github.io/extreme-checkers/

> Local 2-player and vs AI work on the live demo. Online multiplayer requires running the game server locally.

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

## Modes

- **Local 2-Player** — hot-seat on one machine
- **Play vs AI** — offline with boardgame.io bot
- **Create / Join Online** — multiplayer via Socket.IO

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
