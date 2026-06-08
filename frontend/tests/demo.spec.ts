import { test, expect } from '@playwright/test';

test('KAVACH dashboard loads', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('text=KAVACH')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=AUTONOMOUS SPACE WEATHER SHIELD')).toBeVisible();
});

test('KP gauge displays', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('text=KP-INDEX')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=NOAA REALTIME')).toBeVisible();
});

test('Demo panel has replay button', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('text=REPLAY STORM')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=MAY 2024 REPLAY')).toBeVisible();
});

test('Alert feed shows empty state', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('text=ALERT LOG')).toBeVisible({ timeout: 10000 });
});

test('Backend health endpoint', async ({ request }) => {
  const res = await request.get('http://localhost:8000/health');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.status).toBe('ok');
});

test('Storm may2024 endpoint returns Kp 9.0', async ({ request }) => {
  const res = await request.get('http://localhost:8000/storm/may2024');
  expect(res.ok()).toBeTruthy();
  const storms = await res.json();
  expect(storms.length).toBeGreaterThan(0);
  expect(storms[0].max_kp).toBe(9.0);
  expect(storms[0].severity).toBe('red');
});

test('DISCOM endpoint returns 28 zones', async ({ request }) => {
  const res = await request.get('http://localhost:8000/alerts/discoms?severity=red&kp=9.0');
  expect(res.ok()).toBeTruthy();
  const zones = await res.json();
  expect(zones.length).toBe(28);
  const affected = zones.filter((z: { affected: boolean }) => z.affected);
  expect(affected.length).toBe(28);
});
