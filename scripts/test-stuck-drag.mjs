/**
 * Regression: pointerdown on a piece must NOT disable all squares until the
 * drag threshold is crossed. Lost pointerups after a mere tap must not softlock.
 *
 * Run: node scripts/test-stuck-drag.mjs  (dev server on :5173)
 */
import { chromium } from 'playwright';

const URL = process.env.TEST_URL ?? 'http://localhost:5173/';

async function boardStats(page) {
  return page.evaluate(() => {
    const squares = [...document.querySelectorAll('button.board-square')];
    return {
      turn: document.querySelector('.turn-indicator')?.textContent ?? '',
      drag: document.querySelectorAll('.piece-sprite--draggable').length,
      disabled: squares.filter((s) => s.disabled).length,
      enabled: squares.filter((s) => !s.disabled).length,
      draggingClass: document.querySelector('.board-2d')?.className ?? '',
    };
  });
}

async function startAiGame(page) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /play vs ai/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^start$/i }).click();
  await page.waitForSelector('.piece-sprite--draggable', { timeout: 15000 });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await startAiGame(page);

  const before = await boardStats(page);
  if (before.enabled < 1) {
    throw new Error(`Expected interactive squares at start, got ${JSON.stringify(before)}`);
  }

  // Stuck pointerdown without up — must NOT softlock the board anymore.
  await page.evaluate(() => {
    const el = document.querySelector('.piece-sprite--draggable');
    if (!el) throw new Error('no piece');
    const rect = el.getBoundingClientRect();
    el.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 5,
        clientY: rect.top + 5,
        button: 0,
        pointerId: 99,
        pointerType: 'touch',
      }),
    );
  });
  await page.waitForTimeout(80);
  const stuckDown = await boardStats(page);
  if (stuckDown.enabled < 1) {
    throw new Error(
      `SOFTLOCK: pointerdown alone disabled the board: ${JSON.stringify(stuckDown)}`,
    );
  }

  // Window pointerup should finish the pending tap as a select (or no-op cleanly).
  await page.evaluate(() => {
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        clientX: 10,
        clientY: 10,
        button: 0,
        pointerId: 99,
        pointerType: 'touch',
      }),
    );
  });
  await page.waitForTimeout(80);
  const afterUp = await boardStats(page);
  if (afterUp.enabled < 1) {
    throw new Error(`SOFTLOCK after pointerup: ${JSON.stringify(afterUp)}`);
  }

  // Complete several full turns vs AI without softlock.
  for (let i = 0; i < 6; i++) {
    const turn = ((await page.locator('.turn-indicator').innerText()) || '').toLowerCase();
    if (turn.includes('wins')) break;

    const piece = page.locator('.piece-sprite--draggable').first();
    await piece.waitFor({ timeout: 5000 });
    const fromGrid = await piece.evaluate((el) => el.style.gridArea);
    await piece.click();
    await page.waitForSelector('.board-square__highlight', { timeout: 3000 });

    const fromLabel = `Square ${fromGrid.replace(' / ', ', ')}`;
    const destLabel = await page.evaluate((skip) => {
      for (const btn of document.querySelectorAll('button.board-square')) {
        const label = btn.getAttribute('aria-label');
        if (!label || label === skip) continue;
        if (btn.querySelector('.board-square__highlight')) return label;
      }
      return null;
    }, fromLabel);
    if (!destLabel) throw new Error(`No destination from ${fromLabel}`);
    await page.locator(`button[aria-label="${destLabel}"]`).click({ force: true });

    await page.waitForFunction(
      () => {
        const text = (document.querySelector('.turn-indicator')?.textContent || '').toLowerCase();
        return text.includes('your turn') || text.includes("red's turn") || text.includes('wins');
      },
      { timeout: 15000 },
    );

    const mid = await boardStats(page);
    const t = mid.turn.toLowerCase();
    if (!t.includes('wins') && mid.enabled < 1 && mid.drag < 1) {
      throw new Error(`SOFTLOCK after turn ${i + 1}: ${JSON.stringify(mid)}`);
    }
    if (t.includes('wins')) break;
  }

  console.log('PASS: pointerdown no longer softlocks; vs-AI turns stay playable');
  await browser.close();
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
