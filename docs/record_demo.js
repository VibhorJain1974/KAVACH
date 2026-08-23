// KAVACH demo video recorder
// Records the full demo: landing → dashboard → REPLAY STORM → call fires
// Output: docs/kavach_demo.webm (then converted to mp4 via ffmpeg if available)
const { chromium } = require('playwright');
const path = require('path');

const URL = 'https://frontend-rust-xi-79.vercel.app';
const OUT_DIR = path.join(__dirname, 'video_raw');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
  });
  const page = await ctx.newPage();

  console.log('1/7  Opening landing page...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);  // show landing 5s

  console.log('2/7  Navigating to dashboard...');
  // Try "Launch Dashboard" CTA, fall back to direct nav
  const cta = page.locator('text=/launch dashboard/i').first();
  if (await cta.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cta.click();
  } else {
    await page.goto(URL + '/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  }
  await page.waitForTimeout(5000);  // show normal state

  console.log('3/7  Ensuring COMMAND tab visible...');
  const cmd = page.locator('text=/command/i').first();
  if (await cmd.isVisible({ timeout: 3000 }).catch(() => false)) await cmd.click();
  await page.waitForTimeout(2000);

  console.log('4/7  Clicking REPLAY STORM...');
  const replay = page.getByText('▶ REPLAY STORM');
  await replay.waitFor({ state: 'visible', timeout: 10000 });
  await replay.click();

  console.log('5/7  Demo running — waiting 35s for all 9 steps + call...');
  await page.waitForTimeout(35000);

  console.log('6/7  Showing Aurora tab...');
  const aurora = page.locator('text=/aurora/i').first();
  if (await aurora.isVisible({ timeout: 3000 }).catch(() => false)) {
    await aurora.click();
    await page.waitForTimeout(4000);
  }

  console.log('7/7  Showing Daily Shield tab...');
  const shield = page.locator('text=/shield/i').first();
  if (await shield.isVisible({ timeout: 3000 }).catch(() => false)) {
    await shield.click();
    await page.waitForTimeout(4000);
  }

  console.log('Done. Closing browser and saving video...');
  await ctx.close();
  await browser.close();

  // Find the saved webm
  const fs = require('fs');
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.webm'));
  if (files.length) {
    const webm = path.join(OUT_DIR, files[0]);
    const mp4 = path.join(__dirname, 'kavach_demo.mp4');
    console.log(`\nVideo saved: ${webm}`);
    // Try ffmpeg conversion
    const { spawnSync } = require('child_process');
    try {
      const r = spawnSync('ffmpeg', ['-i', webm, '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-c:a', 'aac', mp4, '-y'], { stdio: 'inherit' });
      if (r.status === 0) console.log(`MP4: ${mp4}`);
    } catch {
      console.log('ffmpeg not found — keeping as .webm. Rename to .mp4 or convert online.');
      const webmOut = path.join(__dirname, 'kavach_demo.webm');
      fs.copyFileSync(webm, webmOut);
      console.log(`WebM copy: ${webmOut}`);
    }
  }
})();
