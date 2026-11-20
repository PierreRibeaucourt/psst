/**
 * Fabrique tests/fixtures/orders.html à partir de l'export brut « Vos commandes.html »
 * (qui, lui, n'est jamais versionné) : on ne garde que la liste des commandes, sans
 * scripts, sans noms ni adresses de livraison, avec des n° de commande brouillés, et
 * avec des produits FICTIFS (scripts/demo-catalog.mjs) : un historique d'achats est
 * personnel et peut contenir des cadeaux. Le script s'arrête si un vrai titre subsiste.
 *
 *   node scripts/make-fixture.mjs ["Vos commandes.html"] [tests/fixtures/orders.html]
 *   node scripts/make-fixture.mjs "Your Orders.html" tests/fixtures/orders.com.html
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';
import { CATALOG, PEOPLE } from './demo-catalog.mjs';

const src = process.argv[2] ?? 'Vos commandes.html';
const dest = process.argv[3] ?? 'tests/fixtures/orders.html';
const raw = readFileSync(src, 'utf8');

const window = new Window({
  settings: { disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true },
});
const doc = window.document;
doc.write(raw);

const section = doc.querySelector('.your-orders-content-container');
if (!section) throw new Error('Liste des commandes introuvable dans ' + src);

section.querySelectorAll('script, noscript, iframe, form input[type=hidden]').forEach((n) => n.remove());
// Colonne de droite : recommandations « Acheté en… », publicités.
section.querySelectorAll('.right-rail, .right-rail-top').forEach((n) => n.remove());
const lang = raw.includes('lang="fr') ? 'fr' : 'en';
const recipient = lang === 'fr' ? 'Destinataire' : 'Recipient';

// Produits fictifs, carte par carte.
const realTitles = [];
[...section.querySelectorAll('.js-order-card')].forEach((card, i) => {
  const items = CATALOG[i % CATALOG.length];
  const titles = [...card.querySelectorAll('.yohtmlc-product-title')];
  const images = [...card.querySelectorAll('.product-image img, .item-box img')];
  titles.forEach((t, j) => {
    realTitles.push(t.textContent.replace(/\s+/g, ' ').trim());
    const target = t.querySelector('a') ?? t;
    target.textContent = items[j % items.length][lang];
  });
  images.forEach((img, j) => {
    const item = items[j % items.length];
    if (img.getAttribute('alt')) realTitles.push(img.getAttribute('alt'));
    img.setAttribute('alt', item[lang]);
    for (const a of ['srcset', 'data-a-hires', 'data-src', 'data-old-hires', 'data-a-dynamic-image']) img.removeAttribute(a);
    if (item.img) img.setAttribute('src', `./demo-products/${item.img}.png`);
  });
  // « Commandé par » / « Ordered by »
  for (const li of card.querySelectorAll('.order-header__header-list-item')) {
    const label = li.querySelector('.a-text-caps')?.textContent ?? '';
    if (/command\S* par|ordered by/i.test(label)) {
      const value = [...li.querySelectorAll('span')].pop();
      if (value) value.textContent = PEOPLE[i % PEOPLE.length];
    }
  }
});
for (const r of section.querySelectorAll('.yohtmlc-recipient')) {
  r.querySelectorAll('.a-popover-trigger').forEach((n) => (n.textContent = recipient));
  r.querySelectorAll('.a-popover-preload').forEach((n) => n.remove());
}

let html = section.outerHTML
  .replace(/buyagain\?ats=[^"&]*/g, 'buyagain') // contient la liste des produits, encodée
  .replace(/\bB0[A-Z0-9]{8}\b/g, 'B0DEMO0000') // identifiants de produits (ASIN)
  .replace(/\/dp\/\d{9}[\dX]/g, '/dp/B0DEMO0000'); // ASIN des livres (ISBN)
const ids = new Set(html.match(/\b[0-9A-Z]{3}-\d{7}-\d{7}\b/g) ?? []);
const fake = (id) => {
  const digits = createHash('sha256').update('fixture:' + id).digest('hex').replace(/[a-f]/g, '').padEnd(14, '7');
  return `${id.slice(0, 3)}-${digits.slice(0, 7)}-${digits.slice(7, 14)}`;
};
for (const id of ids) html = html.split(id).join(fake(id));

const links = [...doc.querySelectorAll('link[rel=stylesheet]')]
  .map((l) => l.getAttribute('href'))
  .filter((h) => h && h.startsWith('./') && h.includes('_files/'))
  .map((h) => `<link rel="stylesheet" href="${h}">`)
  .join('\n');

const out = `<!doctype html>
<html lang="${raw.includes('lang="fr') ? 'fr-fr' : 'en-us'}">
<head>
<meta charset="utf-8">
<title>${doc.title || 'Orders'}</title>
<!-- Fixture anonymisée générée par scripts/make-fixture.mjs. Styles : servis depuis l'export local s'il est présent. -->
${links}
</head>
<body>
${html}
</body>
</html>
`;
// Garde-fou : aucun vrai titre ne doit subsister, même tronqué ou échappé.
const leaks = realTitles
  .map((t) => t.slice(0, 18))
  .filter((t) => t.length >= 8 && (out.includes(t) || out.includes(t.replace(/'/g, '&#39;')) || out.includes(t.replace(/&/g, '&amp;'))));
if (leaks.length) throw new Error('Vrais titres encore présents : ' + leaks.join(' | '));

mkdirSync('tests/fixtures', { recursive: true });
writeFileSync(dest, out);
console.log(`${dest} : ${ids.size} n° brouillés, ${Math.round(out.length / 1024)} Ko`);
await window.happyDOM.close();
