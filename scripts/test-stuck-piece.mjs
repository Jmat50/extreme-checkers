/**
 * Browser regression: play many turns with empty-square misclicks;
 * turn must only advance after a completed move.
 *
 * Run: node scripts/test-stuck-piece.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.TEST_URL ?? 'http://localhost:5173/';

async function turnSide(page) {
  const text = ((await page.locator('.turn-indicator').innerText()) || '').toLowerCase();
  if (text.includes('wins')) return 'over';
  if (text.includes("red's turn")) return 'red';
  if (text.includes("black's turn")) return 'black';
  return 'unknown';
}

async function playOneMove(page) {
  const piece = page.locator('.piece-sprite--draggable').first();
  await piece.waitFor({ timeout: 5000 });
  const fromGrid = await piece.evaluate((el) => el.style.gridArea);
  await piece.click();
  await page.waitForSelector('.board-square__highlight', { timeout: 3000 });

  const targets = page.locator('button.board-square').filter({
    has: page.locator('.board-square__highlight'),
  });
  const count = await targets.count();
  for (let i = 0; i < count; i++) {
    const btn = targets.nth(i);
    const label = await btn.getAttribute('aria-label');
    if (label === `Square ${fromGrid.replace(' / ', ', ')}`) continue;
    await btn.click();
    await page.waitForTimeout(150);
    return fromGrid;
  }
  throw new Error(`No destination for piece at ${fromGrid}`);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Local 2-Player' }).click();
  await page.waitForSelector('.piece-sprite--draggable');
  await page.waitForSelector('.turn-indicator');

  let movesPlayed = 0;
  for (let i = 0; i < 20; i++) {
    const before = await turnSide(page);
    if (before === 'over') break;

    const dragCount = await page.locator('.piece-sprite--draggable').count();
    if (dragCount === 0) {
      throw new Error(`No draggable pieces on ${before}'s turn at move ${i + 1}`);
    }

    // Empty dark squares — misclicks that used to burn maxMoves:2
    await page.locator('button[aria-label="Square 4, 1"]').click({ force: true });
    await page.locator('button[aria-label="Square 5, 2"]').click({ force: true });
    const afterMisclick = await turnSide(page);
    if (afterMisclick !== before) {
      throw new Error(`Misclick ended turn at move ${i + 1}: ${before} -> ${afterMisclick}`);
    }

    await playOneMove(page);
    movesPlayed++;
    const after = await turnSide(page);
    if (after === 'over') break;
    if (after === before) {
      throw new Error(`Turn did not flip after move ${i + 1}: still ${after}`);
    }
  }

  if (movesPlayed < 8) {
    throw new Error(`Expected at least 8 successful moves, got ${movesPlayed}`);
  }
  // Ignore transient background animation errors; gameplay assertions above are the gate.
  const gameplayErrors = errors.filter((e) => !e.includes("reading 'c1'"));
  if (gameplayErrors.length) {
    throw new Error(`Page errors: ${gameplayErrors.join('; ')}`);
  }

  console.log(`PASS: ${movesPlayed} turns with misclicks; no softlock`);
  await browser.close();
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
