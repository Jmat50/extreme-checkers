# AGENTS — Game rules / AI / turns

Guidance for the shared checkers engine (`src/game/`) and how the React client must talk to it. Root `AGENTS.md` covers repo layout; this file is the softlock / regression checklist.

## Modes (`client.tsx` / `App.tsx`)

- **local** — no `multiplayer`; both seats on one client (`playerID` undefined).
- **ai** — `Local({ bots: { '1': createCheckersBot(...) } })`; human is always seat `'0'`.
- **online** — `SocketIO` + credentials; never drive online with two-step master `selectSquare` (races). Live path is client selection → atomic `playMove`.

## Turn model (boardgame.io)

- **Do not use `maxMoves` / `minMoves` for selection.** Select / reselect / deselect are UI-only and must not burn the turn. Turns end only via `events.endTurn()` after a completed board move.
- **Human plays** commit with `playMove(move)` (one hop). If `mustContinueFrom` is set, the same player keeps the turn for the next forced jump.
- **AI / bots** commit with `playMove(move, true)` so `applyAiMove` auto-completes the full jump chain, then `endTurn()`.
- `ai.enumerate` must emit `[move, true]` and use `getLegalMoves(..., G.mustContinueFrom)` — the bot indexes into that same list (`bot.ts`).
- Default rules use omnidirectional pieces (`allPiecesStartAsKings`); do not “fix” men to forward-only without an explicit design change.
- Landing on a **hazard** removes the piece (`placePiece`); the chain ends — no `mustContinueFrom` from an empty square.

## Legal moves vs UI selection

| Helper | Use |
|--------|-----|
| `getLegalMoves(board, color, mustContinueFrom)` | What may be submitted *right now* (respects mid-chain) |
| `getAllMoves(board, color)` | All slides + captures for a fresh turn / `endIf` (captures are optional) |
| `getValidMovesForSelection(...)` | Click/drag highlights for one piece |
| `executeMove` | One hop; may set `mustContinueFrom` |
| `applyAiMove` | Root hop + finish chain for search / bot autoComplete |

Capture generation is **single-step only**. Multi-jumps are hop-by-hop via `mustContinueFrom`. Do not restore “maximal chain only” move lists — that hid intermediate landings and looked like a softlock in the UI.

## Client selection (GameBoard)

- Selection / green targets are **client state**, not master `G.selected`, so online SocketIO does not race two `selectSquare` calls.
- Commit with atomic `playMove` only.
- While `G.mustContinueFrom` is set, ignore clicks that would change the chained piece.
- Clear client selection on `ctx.currentPlayer` / gameover; re-hydrate from `G.mustContinueFrom` + `G.validMoves` for mid-chain.

## AI search (`ai.ts` / `bot.ts`)

- Difficulty maps to depth + time budget (`difficultyParams`). Search must stay timed so the Local bot does not freeze the tab.
- Evaluation and search call into `logic.ts` only — no React / DOM.
- Bot `play()` must never return an empty/undefined action when the game is not over; map `pickAiMove` through the enumerated action list.

## Softlock checklist (if “I can’t move”)

1. **Stuck drag** (`usePieceDrag`): only an *active* drag (past threshold) may disable squares. Pointerdown alone must not `setDrag`. Finish on `window` pointerup/cancel; abort on `interactive === false`, blur, visibility hidden; next pointerdown resets a stale session.
2. **Burned turn**: selection no-ops ending the turn (`maxMoves`) — covered by `scripts/test-turn-burn.ts`.
3. **Mid-chain with no targets**: `mustContinueFrom` set but empty continuations — should not happen if `executeMove` and `getLegalMoves` agree; `scripts/test-jump-rules.ts`.
4. **AI never replies**: Local bot hang / invalid action — `scripts/test-ai-jumps.mjs`, `scripts/test-stuck-drag.mjs`.
5. **`endIf` vs enumerate disagree**: game not over but zero legal moves for current player.

## Regression commands

```bash
npm run dev   # :5173
node scripts/test-stuck-drag.mjs
node scripts/test-ai-jumps.mjs
node scripts/test-stuck-piece.mjs
npx tsx scripts/test-turn-burn.ts
npx tsx scripts/test-jump-rules.ts
```

Lobby “Play vs AI” opens a difficulty dialog — browser tests must click **Start** after **Play vs AI**.
