/**
 * Manual UI test: drag a red piece to a valid square on local dev server.
 * Run: node scripts/test-drag.mjs
 * Requires: npx playwright (downloads on first run)
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

  await piece.click();
  await page.waitForSelector('.board-square__highlight');

  const targetBtn = page
    .locator('button.board-square')
    .filter({ has: page.locator('.board-square__highlight') })
    .filter({ hasNot: page.locator('.board-square__highlight--drop-target') });
  // Prefer a valid-move highlight (not the selected-piece highlight).
  const targetCount = await targetBtn.count();
  let targetLabel = null;
  let clickTarget = targetBtn.first();
  for (let i = 0; i < targetCount; i++) {
    const btn = targetBtn.nth(i);
    const label = await btn.getAttribute('aria-label');
    if (label !== `Square ${fromGrid.replace(' / ', ', ')}`) {
      clickTarget = btn;
      targetLabel = label;
      break;
    }
  }
  await clickTarget.click();
  await page.waitForTimeout(300);

  const gridsAfterClick = await page
    .locator('.piece-sprite')
    .evaluateAll((els) => els.map((el) => el.style.gridArea));
  const pieceCountAfterClick = gridsAfterClick.length;
  const clickMoved =
    pieceCountAfterClick < 10 || !gridsAfterClick.includes(fromGrid);

  // Reload for drag test
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Local 2-Player' }).click();
  await page.waitForSelector('.piece-sprite--draggable');

  const dragPiece = page.locator('.piece-sprite--draggable').first();
  const dragFromGrid = await dragPiece.evaluate((el) => el.style.gridArea);

  const dragHighlights = page.locator('button.board-square').filter({
    has: page.locator('.board-square__highlight'),
  });

  await dragPiece.hover();
  await page.mouse.down();
  await page.waitForTimeout(80);
  await dragHighlights.first().waitFor({ timeout: 3000 });

  let dragTarget = dragHighlights.first();
  let dragTargetLabel = null;
  const dragHighlightCount = await dragHighlights.count();
  for (let i = 0; i < dragHighlightCount; i++) {
    const btn = dragHighlights.nth(i);
    const label = await btn.getAttribute('aria-label');
    if (label !== `Square ${dragFromGrid.replace(' / ', ', ')}`) {
      dragTarget = btn;
      dragTargetLabel = label;
      break;
    }
  }

  const targetBox = await dragTarget.boundingBox();
  if (!targetBox) throw new Error('No drag target box');
  const toX = targetBox.x + targetBox.width / 2;
  const toY = targetBox.y + targetBox.height / 2;
  await page.mouse.move(toX, toY, { steps: 15 });
  const sawGhost = await page.locator('.piece-drag-ghost').isVisible();
  await page.mouse.up();
  await page.waitForTimeout(400);

  const gridsAfterDrag = await page
    .locator('.piece-sprite')
    .evaluateAll((els) => els.map((el) => el.style.gridArea));
  const dragMoved =
    !gridsAfterDrag.includes(dragFromGrid) || gridsAfterDrag.length < 10;

  const turnText = await page.locator('.turn-indicator').textContent();

  console.log(
    JSON.stringify(
      {
        url: URL,
        clickToMove: { fromGrid, targetLabel, moved: clickMoved, gridsAfterClick },
        dragDrop: {
          fromGrid: dragFromGrid,
          targetLabel: dragTargetLabel,
          sawGhost,
          moved: dragMoved,
          gridsAfterDrag,
        },
        turnText: turnText?.trim(),
        pass: clickMoved && dragMoved,
      },
      null,
      2,
    ),
  );

  await browser.close();
  if (!clickMoved || !dragMoved) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
