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

## Credits

### Art & models

- <a href="https://www.vecteezy.com/free-vector/bomb-icon">Bomb Icon Vectors by Vecteezy</a> (hazard square markers; source EPS in `assets/icons/bomb-source.eps`)
- ["Checker Board"](https://skfb.ly/oLTyV) by AnshiNoWara NG+ is licensed under [Creative Commons Attribution 4.0](http://creativecommons.org/licenses/by/4.0/) (board and piece meshes / PBR textures)

### Environment

- Studio HDRI from the [Three.js examples collection](https://github.com/mrdoob/three.js/tree/dev/examples/textures/equirectangular) (`venice_sunset_1k.hdr`, used as `public/hdri/studio.hdr`)

### Open-source libraries

- [boardgame.io](https://boardgame.io/) — game state, turns, multiplayer, and AI
- [React](https://react.dev/) — UI
- [Vite](https://vitejs.dev/) — build tooling
- [Three.js](https://threejs.org/) — 3D rendering
- [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) & [@react-three/drei](https://github.com/pmndrs/drei) — React renderer and helpers for Three.js
- [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing) — bloom and vignette
- [Socket.IO](https://socket.io/) — real-time transport (via boardgame.io client)
