import { chromium } from 'playwright';

const URL = process.env.TEST_URL ?? 'http://localhost:5175/extreme-checkers/';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  page.on('console', (msg) => {
    if (msg.text().includes('BGIO')) console.log('browser:', msg.text());
  });

  await page.addInitScript(() => {
    const orig = window.localStorage.setItem;
    window.localStorage.setItem = function (...args) {
      return orig.apply(this, args);
    };
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Local 2-Player' }).click();
  await page.waitForSelector('.piece-sprite--draggable');

  const diag = await page.evaluate(async () => {
    const piece = document.querySelector('.piece-sprite--draggable');
    const squareBtn = document.querySelector(
      'button.board-square[aria-label="Square 1, 2"]',
    );
    if (!piece || !squareBtn) return { error: 'missing elements' };

    piece.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        button: 0,
        buttons: 1,
        isPrimary: true,
      }),
    );

    await new Promise((r) => setTimeout(r, 100));

    const highlights = [
      ...document.querySelectorAll('.board-square__highlight'),
    ].map((h) => h.parentElement?.getAttribute('aria-label'));

    (squareBtn as HTMLButtonElement).click();

    await new Promise((r) => setTimeout(r, 200));

    const grids = [...document.querySelectorAll('.piece-sprite')].map(
      (p) => (p as HTMLElement).style.gridArea,
    );

    return { highlights, grids, pieceCount: grids.length };
  });

  console.log(JSON.stringify(diag, null, 2));
  await browser.close();
}

main();
