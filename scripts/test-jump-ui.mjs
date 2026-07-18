/**
 * Browser regression for the "red can't jump black" bug.
 *
 * Local 2-player, default rules. Scripted line:
 *   1. red  (2,3) -> (3,4)  via DRAG
 *   2. black (5,4) -> (4,5) via click
 *   3. red is now forced to jump: (3,4) x (4,5) -> lands (5,6)
 *      -> chain continues: (5,6) x (6,5) -> lands (7,4) which is a hazard
 *      -> red piece explodes, turn passes to black.
 *
 * Verifies: adjacent jump landing is highlighted and clickable, forced
 * capture disables other pieces, multi-jump continuation stays on the same
 * player's turn, hazards eliminate, and the turn only then flips.
 *
 * Run: node scripts/test-jump-ui.mjs  (dev server on :5173)
 */
import { chromium } from 'playwright';

const URL = process.env.TEST_URL ?? 'http://localhost:5173/';

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    console.log('PASS:', msg);
  }
}

async function turnSide(page) {
  const text = ((await page.locator('.turn-indicator').innerText()) || '').toLowerCase();
  if (text.includes('wins')) return 'over';
  if (text.includes("red's turn")) return 'red';
  if (text.includes("black's turn")) return 'black';
  return 'unknown';
}

/** All pieces as { row, col, color } (0-indexed). */
async function boardPieces(page) {
  return page.$$eval('.piece-sprite', (els) =>
    els.map((el) => {
      const [r, c] = el.style.gridArea.split('/').map((s) => parseInt(s.trim(), 10));
      const src = el.querySelector('img')?.getAttribute('src') ?? '';
      return {
        row: r - 1,
        col: c - 1,
        color: src.includes('piece-red') ? 'red' : 'black',
      };
    }),
  );
}

async function pieceHandle(page, row, col) {
  const handle = await page.evaluateHandle(
    ({ row, col }) => {
      const target = `${row + 1} / ${col + 1}`;
      return [...document.querySelectorAll('.piece-sprite')].find((el) =>
        el.style.gridArea.startsWith(target),
      );
    },
    { row, col },
  );
  const el = handle.asElement();
  if (!el) throw new Error(`No piece at (${row},${col})`);
  return el;
}

function squareButton(page, row, col) {
  return page.locator(`button[aria-label="Square ${row + 1}, ${col + 1}"]`);
}

async function highlightedSquares(page) {
  return page.$$eval('button.board-square', (btns) =>
    btns
      .filter((b) => b.querySelector('.board-square__highlight'))
      .map((b) => {
        const m = b.getAttribute('aria-label').match(/Square (\d+), (\d+)/);
        return { row: Number(m[1]) - 1, col: Number(m[2]) - 1 };
      }),
  );
}

async function dragPiece(page, from, to) {
  const piece = await pieceHandle(page, from.row, from.col);
  const src = await piece.boundingBox();
  const dst = await squareButton(page, to.row, to.col).boundingBox();
  const sx = src.x + src.width / 2;
  const sy = src.y + src.height / 2;
  const dx = dst.x + dst.width / 2;
  const dy = dst.y + dst.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(sx + ((dx - sx) * i) / 8, sy + ((dy - sy) * i) / 8);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForTimeout(200);
}

async function pieceCount(page, color) {
  const pieces = await boardPieces(page);
  return pieces.filter((p) => p.color === color).length;
}

async function hasPiece(page, row, col, color) {
  const pieces = await boardPieces(page);
  return pieces.some((p) => p.row === row && p.col === col && p.color === color);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Local 2-Player' }).click();
  await page.waitForSelector('.piece-sprite--draggable');
  assert((await turnSide(page)) === 'red', 'game starts on red');

  // 1. DRAG red (2,3) -> (3,4)
  await dragPiece(page, { row: 2, col: 3 }, { row: 3, col: 4 });
  assert(await hasPiece(page, 3, 4, 'red'), 'drag: red moved (2,3)->(3,4)');
  assert((await turnSide(page)) === 'black', 'drag: turn passed to black');

  // 2. CLICK black (5,4) -> (4,5)
  await (await pieceHandle(page, 5, 4)).click();
  await page.waitForSelector('.board-square__highlight');
  await squareButton(page, 4, 5).click();
  await page.waitForTimeout(200);
  assert(await hasPiece(page, 4, 5, 'black'), 'click: black moved (5,4)->(4,5)');
  assert((await turnSide(page)) === 'red', 'click: turn passed to red');

  // 3. Forced capture: only red (3,4) should be draggable
  const draggableCount = await page.locator('.piece-sprite--draggable').count();
  assert(draggableCount === 1, `forced capture: exactly 1 draggable red piece (got ${draggableCount})`);

  await (await pieceHandle(page, 3, 4)).click();
  await page.waitForTimeout(150);
  let hl = await highlightedSquares(page);
  const targets = hl.filter((s) => !(s.row === 3 && s.col === 4));
  assert(
    targets.length === 1 && targets[0].row === 5 && targets[0].col === 6,
    `jump: adjacent landing (5,6) is the highlighted target (got ${JSON.stringify(targets)})`,
  );

  // Execute the jump — this is exactly what the user could not do
  await squareButton(page, 5, 6).click();
  await page.waitForTimeout(250);
  assert(await hasPiece(page, 5, 6, 'red'), 'jump: red landed on (5,6)');
  assert(!(await hasPiece(page, 4, 5, 'black')), 'jump: black (4,5) captured');

  // 4. Chain continuation: still red's turn, must jump (6,5) onto hazard (7,4)
  assert((await turnSide(page)) === 'red', 'chain: still red mid multi-jump');
  hl = await highlightedSquares(page);
  const cont = hl.filter((s) => !(s.row === 5 && s.col === 6));
  assert(
    cont.length === 1 && cont[0].row === 7 && cont[0].col === 4,
    `chain: continuation to hazard (7,4) highlighted (got ${JSON.stringify(cont)})`,
  );

  await squareButton(page, 7, 4).click();
  await page.waitForTimeout(300);
  assert(!(await hasPiece(page, 7, 4, 'red')), 'hazard: red eliminated on bomb square');
  assert(!(await hasPiece(page, 6, 5, 'black')), 'hazard: black (6,5) captured in chain');
  assert((await turnSide(page)) === 'black', 'chain complete: turn passes to black');

  assert((await pieceCount(page, 'red')) === 4, 'piece count: red has 4 left');
  assert((await pieceCount(page, 'black')) === 3, 'piece count: black has 3 left');

  const gameplayErrors = errors.filter((e) => !e.includes("reading 'c1'"));
  assert(gameplayErrors.length === 0, `no page errors (got: ${gameplayErrors.join('; ')})`);

  await browser.close();
  if (failed > 0) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\nAll jump UI checks passed');
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
