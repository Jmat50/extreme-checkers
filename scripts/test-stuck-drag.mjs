/**
 * Regression: a lost pointerup after piece pointerdown must not softlock
 * the board (all squares disabled). Window-level pointer listeners + stale
 * session reset should recover on the next interaction.
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

  // Lost pointerup (touch-style): previously left drag set and disabled all squares.
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

  await page.waitForTimeout(50);
  const mid = await boardStats(page);
  // During an open session squares may disable; window pointerup must clear it.
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
  await page.waitForTimeout(50);
  const afterUp = await boardStats(page);
  if (afterUp.enabled < 1) {
    throw new Error(
      `SOFTLOCK: window pointerup did not restore squares. mid=${JSON.stringify(mid)} after=${JSON.stringify(afterUp)}`,
    );
  }

  // Second lost pointerdown, then recover by starting a new piece interaction.
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
        pointerId: 100,
        pointerType: 'touch',
      }),
    );
  });
  await page.waitForTimeout(50);
  await page.locator('.piece-sprite--draggable').nth(1).click({ force: true });
  await page.waitForTimeout(100);
  const afterRecover = await boardStats(page);
  if (afterRecover.enabled < 1) {
    throw new Error(
      `SOFTLOCK: next piece interaction did not recover. ${JSON.stringify(afterRecover)}`,
    );
  }

  // Still able to complete a real move after the glitch.
  const piece = page.locator('.piece-sprite--draggable').first();
  await piece.click();
  await page.waitForSelector('.board-square__highlight', { timeout: 3000 });
  const target = page.locator('button.board-square').filter({
    has: page.locator('.board-square__highlight'),
  }).first();
  await target.click();
  await page.waitForFunction(
    () => {
      const t = (document.querySelector('.turn-indicator')?.textContent || '').toLowerCase();
      return t.includes('black') || t.includes('wins') || t.includes('your turn');
    },
    { timeout: 10000 },
  );

  console.log('PASS: stuck-drag softlock recovered; move still playable');
  await browser.close();
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
