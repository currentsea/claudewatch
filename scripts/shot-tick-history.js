/**
 * Capture docs/screenshot-tick-history.png — the Session activity card in its
 * "By day" (timeline) view, which is the dashboard's per-day usage history.
 *
 * Assumes the dev stack is running (React on :3005, API proxied on :3001).
 *   node scripts/shot-tick-history.js
 */
const { chromium } = require('playwright');

const URL = process.env.SHOT_URL || 'http://localhost:3005';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor: 2,
  });

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByRole('heading', { name: /ClaudeWatch/i }).first().waitFor({ timeout: 60000 });

  const timelineBtn = page.getByTestId('activity-mode-timeline');
  await timelineBtn.scrollIntoViewIfNeeded();
  await timelineBtn.click();
  await page.waitForTimeout(2000); // let the bar chart animate in

  // Frame the activity-chart card (nearest rounded container around the toggle).
  const card = timelineBtn.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
  if (await card.count()) {
    await card.first().screenshot({ path: 'docs/screenshot-tick-history.png' });
  } else {
    await page.screenshot({ path: 'docs/screenshot-tick-history.png', fullPage: true });
  }
  console.log('wrote docs/screenshot-tick-history.png');

  await browser.close();
  console.log('TICK_SHOT_DONE');
})().catch((e) => {
  console.error('TICK_SHOT_ERROR', e);
  process.exit(1);
});
