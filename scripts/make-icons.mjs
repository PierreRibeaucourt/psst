/**
 * Icônes de l'extension (public/icon/*.png) et icône du Store (store/assets/store-icon-128.png),
 * rendues depuis brand/mark.svg.  node scripts/make-icons.mjs
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const svg = readFileSync('brand/mark.svg', 'utf8');
mkdirSync('public/icon', { recursive: true });
mkdirSync('store/assets', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
async function render(size, artwork, out) {
  const pad = (size - artwork) / 2;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}</style>
     <div style="padding:${pad}px">${svg.replace('<svg ', `<svg width="${artwork}" height="${artwork}" style="display:block" `)}</div>`,
  );
  await page.screenshot({ path: out, omitBackground: true });
}
for (const s of [16, 32, 48, 128]) await render(s, s, `public/icon/${s}.png`);
// Store : 128×128 dont 96×96 de dessin et 16 px de marge transparente (recommandation Google).
await render(128, 96, 'store/assets/store-icon-128.png');
await browser.close();
console.log('icônes écrites');
