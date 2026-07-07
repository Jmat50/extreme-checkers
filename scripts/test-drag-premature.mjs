/**
 * Ensures starting a drag does not complete a move or end the turn.
 * Run: node scripts/test-drag-premature.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.TEST_URL ?? 'http://localhost:5173/extreme-checkers/';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Local 2-Player' }).click();
  await page.waitForSelector('.piece-sprite--draggable');

  const piece = page.locator('.piece-sprite--draggable').first();
  const fromGrid = await piece.evaluate((el) => el.style.gridArea);
  const box = await piece.boundingBox();
  if (!box) throw new Error('no piece box');

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(120);

  const mid = await page.evaluate(() => ({
    turn: document.querySelector('.turn-indicator')?.textContent?.trim() ?? '',
    grids: [...document.querySelectorAll('.piece-sprite')].map((el) => el.style.gridArea),
    ghost: !!document.querySelector('.piece-drag-ghost'),
    highlights: document.querySelectorAll('.board-square__highlight').length,
  }));

  await page.mouse.move(cx, cy);
  await page.mouse.up();
  await page.waitForTimeout(200);

  const afterTap = await page.evaluate(() => ({
    turn: document.querySelector('.turn-indicator')?.textContent?.trim() ?? '',
    grids: [...document.querySelectorAll('.piece-sprite')].map((el) => el.style.gridArea),
  }));

  // Full drag should still work
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Local 2-Player' }).click();
  await page.waitForSelector('.piece-sprite--draggable');

  const dragPiece = page.locator('.piece-sprite--draggable').first();
  const dragFromGrid = await dragPiece.evaluate((el) => el.style.gridArea);
  const dragBox = await dragPiece.boundingBox();
  const highlights = page.locator('button.board-square').filter({
    has: page.locator('.board-square__highlight'),
  });

  await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(80);

  let target = highlights.first();
  const count = await highlights.count();
  for (let i = 0; i < count; i++) {
    const btn = highlights.nth(i);
    const label = await btn.getAttribute('aria-label');
    if (label !== `Square ${dragFromGrid.replace(' / ', ', ')}`) {
      target = btn;
      break;
    }
  }

  const tbox = await target.boundingBox();
  await page.mouse.move(tbox.x + tbox.width / 2, tbox.y + tbox.height / 2, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  const afterDrag = await page.evaluate(() => ({
    turn: document.querySelector('.turn-indicator')?.textContent?.trim() ?? '',
    grids: [...document.querySelectorAll('.piece-sprite')].map((el) => el.style.gridArea),
  }));

  const result = {
    fromGrid,
    midStillRedTurn: mid.turn.toLowerCase().includes('red'),
    midPieceStillThere: mid.grids.includes(fromGrid),
    midMoved: !mid.grids.includes(fromGrid),
    afterTapTurn: afterTap.turn,
    afterTapStillRed: afterTap.turn.toLowerCase().includes('red'),
    dragFromGrid,
    dragMoved: !afterDrag.grids.includes(dragFromGrid),
    afterDragTurn: afterDrag.turn,
    pass:
      mid.turn.toLowerCase().includes('red') &&
      mid.grids.includes(fromGrid) &&
      afterTap.turn.toLowerCase().includes('red') &&
      afterTap.grids.includes(fromGrid) &&
      !afterDrag.grids.includes(dragFromGrid),
  };

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  if (!result.pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
