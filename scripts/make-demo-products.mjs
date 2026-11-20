/**
 * Illustrations des produits fictifs (tests/fixtures/demo-products/*.png), dessinées en SVG
 * puis rendues en 300 × 300 sur fond blanc, comme les photos produit d'Amazon.
 *   node scripts/make-demo-products.mjs
 */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const NAVY = '#1B2738';
const S = {
  filter: `
    <ellipse cx="105" cy="230" rx="55" ry="14" fill="#cfd3db"/><rect x="50" y="90" width="110" height="140" fill="#8a7fc7"/>
    <ellipse cx="105" cy="90" rx="55" ry="14" fill="#b3aae6"/><ellipse cx="105" cy="90" rx="24" ry="6" fill="#5d5196"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${58 + i * 17}" y="100" width="6" height="120" fill="#6f63ad"/>`).join('')}
    <ellipse cx="200" cy="240" rx="50" ry="13" fill="#cfd3db"/><rect x="150" y="110" width="100" height="130" fill="#8a7fc7"/>
    <ellipse cx="200" cy="110" rx="50" ry="13" fill="#b3aae6"/><ellipse cx="200" cy="110" rx="22" ry="5" fill="#5d5196"/>`,
  tea: `
    <rect x="40" y="95" width="220" height="140" rx="10" fill="#b07a4a"/><rect x="40" y="80" width="220" height="34" rx="8" fill="#8f5f36"/>
    <rect x="95" y="135" width="110" height="64" rx="8" fill="#fff6e9"/>
    <path d="M150 145 C128 160 132 185 150 190 C168 185 172 160 150 145 Z" fill="#4c9a5b"/><line x1="150" y1="152" x2="150" y2="188" stroke="#2f6d3c" stroke-width="3"/>
    <rect x="70" y="60" width="16" height="22" fill="#e9dcc7"/><rect x="214" y="60" width="16" height="22" fill="#e9dcc7"/>`,
  game: `
    <rect x="35" y="55" width="230" height="190" rx="12" fill="#2b6f8f"/><rect x="35" y="55" width="230" height="46" rx="12" fill="#1f5470"/>
    <rect x="70" y="68" width="160" height="20" rx="10" fill="#ffd36e"/>
    <path d="M80 200 C90 150 150 130 205 155 C240 172 230 210 190 218 C150 226 95 230 80 200 Z" fill="#5bb26a"/>
    ${[[110, 150], [190, 135], [230, 190], [70, 175], [160, 120]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#ffe66e"/><circle cx="${x}" cy="${y}" r="13" fill="#ffe66e" opacity=".35"/>`).join('')}`,
  'game-exp': `
    <rect x="55" y="75" width="190" height="150" rx="12" fill="#e07b39"/><rect x="55" y="75" width="190" height="38" rx="12" fill="#b85d22"/>
    <rect x="85" y="86" width="130" height="16" rx="8" fill="#ffd36e"/>
    <path d="M70 185 Q100 160 130 185 T190 185 T240 180 L240 215 L70 215 Z" fill="#2b6f8f"/>
    <circle cx="200" cy="140" r="7" fill="#ffe66e"/><circle cx="200" cy="140" r="13" fill="#ffe66e" opacity=".35"/>`,
  'book-cook': `
    <rect x="75" y="35" width="160" height="230" rx="6" fill="#c8463d"/><rect x="75" y="35" width="16" height="230" fill="#a5352e"/>
    <circle cx="160" cy="150" r="42" fill="#fff6e9"/><circle cx="160" cy="150" r="30" fill="#f3e2c7"/><rect x="198" y="146" width="40" height="9" rx="4" fill="#fff6e9"/>
    <rect x="110" y="60" width="100" height="12" rx="6" fill="#fff6e9"/><rect x="125" y="80" width="70" height="8" rx="4" fill="#f3b8a8"/>`,
  'book-garden': `
    <rect x="75" y="35" width="160" height="230" rx="6" fill="#4c9a5b"/><rect x="75" y="35" width="16" height="230" fill="#3a7e47"/>
    <path d="M125 175 L195 175 L185 225 L135 225 Z" fill="#d9774b"/>
    <path d="M160 175 C140 150 130 130 140 112 C158 125 165 150 160 175 Z" fill="#bfe3a8"/>
    <path d="M160 175 C180 150 192 128 182 108 C163 122 156 150 160 175 Z" fill="#9fd08a"/>
    <rect x="110" y="60" width="100" height="12" rx="6" fill="#fff6e9"/>`,
  'phone-mount': `
    <rect x="110" y="40" width="90" height="170" rx="16" fill="#2b2f36"/><rect x="118" y="55" width="74" height="140" rx="8" fill="#5f7fa8"/>
    <rect x="90" y="120" width="130" height="30" rx="10" fill="#3b4048"/><rect x="145" y="210" width="20" height="40" fill="#3b4048"/>
    <ellipse cx="155" cy="255" rx="45" ry="14" fill="#2b2f36"/>`,
  towels: `
    ${[0, 1, 2].map((i) => `<rect x="60" y="${95 + i * 45}" width="180" height="40" rx="8" fill="${['#e9e3d8', '#f3e2c7', '#e9e3d8'][i]}"/>
    <rect x="60" y="${105 + i * 45}" width="180" height="6" fill="${['#c8463d', '#2b6f8f', '#4c9a5b'][i]}"/>`).join('')}`,
  lamp: `
    <ellipse cx="110" cy="250" rx="55" ry="12" fill="${NAVY}"/><line x1="110" y1="245" x2="150" y2="140" stroke="${NAVY}" stroke-width="10" stroke-linecap="round"/>
    <line x1="150" y1="140" x2="210" y2="100" stroke="${NAVY}" stroke-width="10" stroke-linecap="round"/>
    <path d="M190 85 L245 115 L225 150 L172 118 Z" fill="${NAVY}"/><ellipse cx="225" cy="150" rx="22" ry="8" fill="#ffe66e" transform="rotate(30 225 150)"/>`,
  mug: `
    <rect x="105" y="70" width="90" height="180" rx="16" fill="#7f8b99"/><rect x="100" y="55" width="100" height="30" rx="10" fill="${NAVY}"/>
    <rect x="105" y="130" width="90" height="40" fill="#ff9f1c"/>`,
  blanket: `
    ${[0, 1, 2].map((i) => `<rect x="${55 + i * 6}" y="${185 - i * 45}" width="${190 - i * 12}" height="48" rx="14" fill="${['#9fb7d6', '#b9cbe3', '#d3e0f0'][i]}"/>`).join('')}
    ${[0, 1, 2, 3].map((i) => `<line x1="${90 + i * 40}" y1="105" x2="${90 + i * 40}" y2="230" stroke="#7d97bb" stroke-width="3" opacity=".6"/>`).join('')}`,
  pillow: `
    <path d="M60 70 Q150 50 240 70 Q255 150 240 230 Q150 250 60 230 Q45 150 60 70 Z" fill="#e8b04b"/>
    <path d="M90 95 Q150 82 210 95 Q220 150 210 205 Q150 218 90 205 Q80 150 90 95 Z" fill="none" stroke="#fff6e9" stroke-width="4" stroke-dasharray="10 8"/>
    <circle cx="150" cy="150" r="16" fill="#fff6e9"/>`,
};

const out = 'tests/fixtures/demo-products';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 300, height: 300 } });
for (const [name, body] of Object.entries(S)) {
  await page.setContent(`<body style="margin:0;background:#fff"><svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">${body}</svg></body>`);
  await page.screenshot({ path: `${out}/${name}.png` });
}
await browser.close();
console.log(`${Object.keys(S).length} illustrations dans ${out}`);
