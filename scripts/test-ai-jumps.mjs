/**
 * Browser regression: vs-AI mode still flows after the step-by-step jump
 * change (bot submits playMove with autoComplete). Plays several red moves,
 * completing any multi-jump chains, and requires the bot to respond each time.
 *
 * Run: node scripts/test-ai-jumps.mjs  (dev server on :5173)
 */
import { chromium } from 'playwright';

const URL = process.env.TEST_URL ?? 'http://localhost:5173/';

async function turnText(page) {
  return ((await page.locator('.turn-indicator').innerText()) || '').toLowerCase();
}

async function isRedTurn(page) {
  const t = await turnText(page);
  return t.includes("red's turn") || t.includes('your turn');
}

async function clickOneHop(page, fromGrid) {
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
    return label.replace('Square ', '').replace(', ', ' / ');
  }
  throw new Error(`No destination for piece at ${fromGrid}`);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /play vs ai/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^start$/i }).click();
  await page.waitForSelector('.piece-sprite--draggable', { timeout: 15000 });

  let movesPlayed = 0;
  for (let i = 0; i < 8; i++) {
    const t = await turnText(page);
    if (t.includes('wins')) break;

    // Red (human) move, completing chains until it's no longer red's move
    const piece = page.locator('.piece-sprite--draggable').first();
    await piece.waitFor({ timeout: 5000 });
    let fromGrid = await piece.evaluate((el) => el.style.gridArea);
    await piece.click();
    await page.waitForSelector('.board-square__highlight', { timeout: 3000 });
    for (let hop = 0; hop < 8; hop++) {
      fromGrid = await clickOneHop(page, fromGrid);
      if (!(await isRedTurn(page))) break;
      const more = await page.locator('.board-square__highlight').count();
      if (more === 0) break;
    }
    movesPlayed++;

    // Bot (black) must respond: red's turn again (or game over)
    await page.waitForFunction(
      () => {
        const el = document.querySelector('.turn-indicator');
        const text = (el?.textContent || '').toLowerCase();
        return text.includes("red's turn") || text.includes('your turn') || text.includes('wins');
      },
      { timeout: 15000 },
    );
    const after = await turnText(page);
    if (after.includes('wins')) break;

    const soft = await page.evaluate(() => {
      const enabled = [...document.querySelectorAll('button.board-square')].filter(
        (s) => !s.disabled,
      ).length;
      const drag = document.querySelectorAll('.piece-sprite--draggable').length;
      return { enabled, drag };
    });
    if (soft.drag === 0 && soft.enabled === 0) {
      throw new Error(`SOFTLOCK after AI reply on move ${movesPlayed}: ${JSON.stringify(soft)}`);
    }
  }

  if (movesPlayed < 5) {
    throw new Error(`Expected at least 5 red moves vs AI, got ${movesPlayed}`);
  }
  const gameplayErrors = errors.filter((e) => !e.includes("reading 'c1'"));
  if (gameplayErrors.length) {
    throw new Error(`Page errors: ${gameplayErrors.join('; ')}`);
  }

  console.log(`PASS: ${movesPlayed} red moves vs AI; bot responded every turn`);
  await browser.close();
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
