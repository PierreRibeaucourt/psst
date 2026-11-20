/**
 * Produit les visuels du Chrome Web Store à partir de la vraie extension :
 * Leo et Emma jouent le scénario, on capture leurs écrans, puis on les met en scène.
 *   node scripts/make-fixture-en.mjs && npx playwright test -c playwright.store.config.ts
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { chromium, expect, test, type Locator, type Page } from '@playwright/test';
import { Person, card, detailsUrl, orderIdOf } from '../e2e/person';
import { marquee, shotFrame, sideBySideFrame, smallTile } from './compose';
import { COPY } from './copy';

const RUNS = [
  { lang: 'fr', host: 'www.amazon.fr', fixture: 'tests/fixtures/orders.html', tea: 'Coffret de thés', gift: 'L’Île aux Lucioles', hideThis: /Cacher cette commande/, hide: 'Cacher', joinBtn: 'Rejoindre', itsMe: 'C’est moi' },
  { lang: 'en', host: 'www.amazon.com', fixture: 'store/fixtures/orders.en.html', tea: 'World Tea Gift Box', gift: 'Firefly Island', hideThis: /Hide this order/, hide: 'Hide', joinBtn: 'Join', itsMe: 'That’s me' },
] as const;
const OUT = 'store/assets';

/** Zone qui va du haut d'une carte au bas d'une autre (marge comprise), en coordonnées de la page. */
async function region(page: Page, first: Locator, last: Locator, pad = 14) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const a = (await first.boundingBox())!;
  const b = (await last.boundingBox())!;
  return page.screenshot({
    fullPage: true,
    clip: { x: a.x - pad, y: a.y - pad, width: a.width + pad * 2, height: b.y + b.height - a.y + pad * 2 },
  });
}

/** Page Amazon chargée, styles et images compris. */
async function settled(page: Page) {
  await page.waitForLoadState('load');
  await page.evaluate(() => document.fonts.ready);
}

for (const run of RUNS) {
  test(`visuels ${run.lang}`, async () => {
    mkdirSync(`${OUT}/${run.lang}`, { recursive: true });
    const leo = await Person.launch('leo', run.lang, run.host, run.fixture, 2);
    const emma = await Person.launch('emma', run.lang, run.host, run.fixture, 2);
    const shots: Record<string, Buffer> = {};
    try {
      // Foyer
      let popup = await leo.popup();
      await popup.locator('#name').fill('Leo');
      await popup.locator('button.primary').first().click();
      await expect(popup.locator('code.invite')).toBeVisible();
      const code = (await popup.locator('code.invite').textContent())!;
      const join = await emma.popup();
      await join.locator('#code').fill(code);
      await join.getByRole('button', { name: run.joinBtn, exact: true }).click();
      await join.locator('#name').fill('Emma');
      await join.getByRole('button', { name: run.itsMe }).click();
      await emma.waitPushed();

      // Leo cache le coffret de thés : panneau ouvert, puis badge
      let page = await leo.openOrders();
      await page.setViewportSize({ width: 1280, height: 1000 });
      await settled(page);
      const tea = card(page, run.tea);
      await tea.getByRole('button', { name: run.hideThis }).click();
      await tea.locator('input[type=date]').fill('2026-12-24');
      await tea.locator('input[type=date]').blur();
      await tea.scrollIntoViewIfNeeded();
      shots.panel = await tea.screenshot();
      await tea.getByRole('button', { name: run.hide, exact: true }).click();
      await expect(tea.locator('psst-bar')).toContainText('Emma');
      await leo.waitPushed();

      // Emma cache le jeu à Leo
      page = await emma.openOrders();
      const gift = card(page, run.gift);
      await gift.getByRole('button', { name: run.hideThis }).click();
      await gift.getByRole('button', { name: run.hide, exact: true }).click();
      await expect(gift.locator('psst-bar')).toContainText('Leo');
      await emma.waitPushed();
      const teaId = await (async () => {
        const p = await leo.openOrders();
        return orderIdOf(p, run.tea);
      })();

      // Les deux listes, même zone : de la carte au-dessus du coffret à la carte sous le jeu
      const views: Record<string, Buffer> = {};
      for (const [who, person] of [['leo', leo], ['emma', emma]] as const) {
        const p = await person.openOrders();
        await p.setViewportSize({ width: 1280, height: 1000 });
        await settled(p);
        const shown = p.locator('.js-order-card[data-cc-state="shown"]');
        views[who] = await region(p, shown.nth(1), shown.nth(3));
      }
      const p = await leo.openOrders();
      await p.setViewportSize({ width: 1280, height: 1000 });
      await settled(p);
      shots.badge = await card(p, run.tea).screenshot();

      // Écran « pas de spoiler »
      const surprise = await emma.context.newPage();
      await surprise.setViewportSize({ width: 820, height: 520 });
      await surprise.goto(detailsUrl(run.host, teaId));
      await expect(surprise.locator('psst-surprise')).toBeVisible();
      shots.surprise = await surprise.screenshot();

      // Popup de Leo
      popup = await leo.popup();
      await popup.setViewportSize({ width: 372, height: 640 });
      await expect(popup.locator('ul.members')).toContainText('Emma');
      await popup.evaluate(() => (document.body.style.width = '340px'));
      shots.popup = await popup.locator('body').screenshot();

      // Mise en scène
      const c = COPY[run.lang];
      const browser = await chromium.launch();
      const stage = await browser.newPage();
      const dir = `${OUT}/${run.lang}`;
      await shotFrame(stage, `${dir}/screenshot-1.png`, c.shots[0], shots.badge, { bleed: 900 });
      await shotFrame(stage, `${dir}/screenshot-2.png`, c.shots[1], shots.panel, { bleed: 900 });
      await sideBySideFrame(stage, `${dir}/screenshot-3.png`, c.shots[2], views.leo!, views.emma!);
      await shotFrame(stage, `${dir}/screenshot-4.png`, c.shots[3], shots.surprise, {
        maxW: 690,
        browserUrl: `${run.host}/your-orders/order-details?orderID=${teaId}`,
      });
      await shotFrame(stage, `${dir}/screenshot-5.png`, c.shots[4], shots.popup, { maxW: 380, maxH: 680 });
      await marquee(stage, `${dir}/marquee-1400x560.png`, c.marquee, shots.badge);
      if (run.lang === 'en') {
        await smallTile(stage, `${OUT}/small-tile-440x280.png`);
        mkdirSync('docs/assets', { recursive: true });
        await marquee(stage, 'docs/assets/og.png', c.marquee, shots.badge, 1200, 480);
      }
      await browser.close();
      // Le site (docs/) réutilise trois captures.
      mkdirSync(`docs/assets/${run.lang}`, { recursive: true });
      for (const n of [2, 3, 4]) copyFileSync(`${dir}/screenshot-${n}.png`, `docs/assets/${run.lang}/screenshot-${n}.png`);
    } finally {
      await leo.close();
      await emma.close();
    }
  });
}
