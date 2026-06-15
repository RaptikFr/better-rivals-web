import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:3000/classements?track_id=7';
const OUT = process.argv[3] ?? 'shot';

const browser = await chromium.launch();

async function shoot(width, height, file) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  // Ouvre le premier groupe (en-tête affichant « N pilote(s) »)
  const headers = page.locator('button:has-text("pilote")');
  try {
    await headers.first().waitFor({ timeout: 8000 });
    const n = await headers.count();
    for (let i = 0; i < n; i++) await headers.nth(i).click();
    await page.waitForTimeout(600);
  } catch { /* pas de groupe : on capture quand même */ }
  await page.screenshot({ path: file, fullPage: true });
  await ctx.close();
  console.log('written', file);
}

await shoot(390, 844, `${process.env.TEMP}\\${OUT}_mobile.png`);
await shoot(1280, 900, `${process.env.TEMP}\\${OUT}_desktop.png`);

await browser.close();
