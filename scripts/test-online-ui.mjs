/**
 * Browser online multiplayer: two seats, atomic moves must work.
 * Requires: vite on :5173, game server on :8000
 * Run: node scripts/test-online-ui.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.TEST_URL ?? 'http://localhost:5173/';

async function turnSide(page) {
  const text = ((await page.locator('.turn-indicator').innerText().catch(() => '')) || '').toLowerCase();
  if (text.includes('wins')) return 'over';
  if (text.includes('your turn')) return 'you';
  if (text.includes("red's turn")) return 'red';
  if (text.includes("black's turn")) return 'black';
  return 'unknown';
}

async function expectTurn(page, predicate, label, timeout = 8000) {
  await page.waitForFunction(
    ([re]) => {
      const t = document.querySelector('.turn-indicator')?.textContent?.toLowerCase() ?? '';
      return new RegExp(re, 'i').test(t);
    },
    [predicate],
    { timeout },
  );
}

async function playOneMove(page) {
  const piece = page.locator('.piece-sprite--draggable').first();
  await piece.waitFor({ timeout: 8000 });
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
    await page.waitForTimeout(250);
    return fromGrid;
  }
  throw new Error(`No destination for piece at ${fromGrid}`);
}

async function enterOnline(page, name) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  const nameInput = page.locator('input#player-name, input[name="playerName"]').first();
  if (await nameInput.count()) {
    await nameInput.fill(name);
  }
  await page.getByRole('button', { name: 'Online Multiplayer Lobby' }).click();
  await page.waitForSelector('text=Online Multiplayer Lobby');
}

async function main() {
  const browser = await chromium.launch();
  const host = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const guest = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const errors = [];
  host.on('pageerror', (e) => errors.push(`host: ${e}`));
  guest.on('pageerror', (e) => errors.push(`guest: ${e}`));

  await enterOnline(host, 'HostRed');
  await host.getByRole('button', { name: 'Create Public Match' }).click();
  await host.waitForSelector('text=Waiting for opponent');
  const matchText = await host.locator('.lobby-match-code').innerText();
  const matchID = matchText.replace(/.*Match ID:\s*/i, '').trim();
  if (!matchID) throw new Error('No match ID');

  await enterOnline(guest, 'GuestBlack');
  await guest.getByPlaceholder('Join with match ID').fill(matchID);
  await guest.getByRole('button', { name: 'Join Match' }).click();

  // Both should enter the game after burn transition / socket sync
  await host.waitForSelector('.turn-indicator', { timeout: 20000 });
  await guest.waitForSelector('.turn-indicator', { timeout: 20000 });
  await expectTurn(host, 'your turn', 'host your turn', 15000);
  await expectTurn(guest, "red's turn", 'guest sees red', 15000);

  // Host (red) must be able to move; guest must not
  const hostDrag = await host.locator('.piece-sprite--draggable').count();
  if (hostDrag === 0) throw new Error('Host has no draggable pieces on red turn');
  const guestDrag = await guest.locator('.piece-sprite--draggable').count();
  if (guestDrag !== 0) throw new Error('Guest should not have draggable pieces on red turn');

  await playOneMove(host);
  await expectTurn(host, "black's turn", 'host sees black after move');
  await expectTurn(guest, 'your turn', 'guest your turn');

  if ((await guest.locator('.piece-sprite--draggable').count()) === 0) {
    throw new Error('Guest has no draggable pieces on black turn');
  }
  await playOneMove(guest);
  await expectTurn(host, 'your turn', 'host your turn again');
  await expectTurn(guest, "red's turn", 'guest sees red again');

  // Second red move — proves online stays playable past first turn
  await playOneMove(host);
  await expectTurn(guest, 'your turn', 'guest your turn again');

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PASS: online UI both seats can move across multiple turns');
  await browser.close();
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
