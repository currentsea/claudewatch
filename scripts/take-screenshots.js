/**
 * Regenerate the dashboard screenshots used in the README.
 *
 * Assumes the dev stack is already running (API on :3001, React on :3005):
 *   npm start            # in one terminal
 *   node scripts/take-screenshots.js
 *
 * Captures docs/screenshot-dashboard.png and docs/screenshot-settings.png.
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
  await page
    .getByRole('heading', { name: /ClaudeWatch/i })
    .first()
    .waitFor({ timeout: 60000 });
  // Let Recharts finish animating before we snap.
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'docs/screenshot-dashboard.png', fullPage: true });
  console.log('wrote docs/screenshot-dashboard.png');

  try {
    await page.getByRole('button', { name: /settings/i }).first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'docs/screenshot-settings.png', fullPage: true });
    console.log('wrote docs/screenshot-settings.png');
  } catch (e) {
    console.error('settings screenshot skipped:', e.message);
  }

  await browser.close();
  console.log('SCREENSHOTS_DONE');
})().catch((e) => {
  console.error('SCREENSHOT_ERROR', e);
  process.exit(1);
});
