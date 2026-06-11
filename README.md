# Extreme Checkers

3D photorealistic checkers built with [boardgame.io](https://boardgame.io), React, and React Three Fiber.

**Live demo:** https://jmat50.github.io/extreme-checkers/

> Local 2-player and vs AI work on the live demo. Online multiplayer requires running the game server locally.

## Run locally

```bash
npm install
npm run convert-models   # one-time: OBJ → GLB conversion
npm run dev:all          # starts game server + Vite client
```

- Client: http://localhost:5173
- Server: http://localhost:8000

## Modes

- **Local 2-Player** — hot-seat on one machine
- **Play vs AI** — offline with boardgame.io bot
- **Create / Join Online** — multiplayer via Socket.IO

## Assets

Source assets live in `assets/` (extracted from checker-board.zip). Web-ready GLBs and textures are in `public/`.
