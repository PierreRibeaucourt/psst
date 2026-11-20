/**
 * Le scénario de départ : Leo cache à Emma le coffret de thés qu’il lui offre,
 * Emma cache à Leo le jeu de société qu’elle lui offre. Chacun dans son propre navigateur.
 * Joué en français sur amazon.fr et en anglais sur amazon.com.
 */
import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { Person, card, detailsUrl, orderIdOf, statesOf } from './person';

const TEA = 'Coffret de thés';
const GAME = 'L’Île aux Lucioles';

const RUNS = [
  {
    lang: 'fr',
    host: 'www.amazon.fr',
    t: {
      create: 'Créer',
      join: 'Rejoindre',
      whoAreYou: 'Qui êtes-vous ?',
      itsMe: 'C’est moi',
      youAre: 'Vous êtes',
      synced: /Synchronisé/,
      hideThis: /Cacher cette commande/,
      hide: 'Cacher',
      hiddenFromEmma: 'Cachée à Emma',
      hiddenFromLeo: 'Cachée à Leo',
      revealed: 'révélée le 25 déc. 2026',
      surprise: 'Pas de spoiler !',
      edit: 'Modifier',
      unhide: 'Ne plus cacher',
      visibleToAll: 'Visible par tout le foyer',
      deleteHousehold: 'Supprimer le foyer pour tout le monde',
      deleted: /supprimé par l’un de ses membres/,
      welcome: 'Nouveau foyer',
    },
  },
  {
    lang: 'en',
    host: 'www.amazon.com',
    t: {
      create: 'Create',
      join: 'Join',
      whoAreYou: 'Who are you?',
      itsMe: 'That’s me',
      youAre: 'You are',
      synced: /Synced/,
      hideThis: /Hide this order/,
      hide: 'Hide',
      hiddenFromEmma: 'Hidden from Emma',
      hiddenFromLeo: 'Hidden from Leo',
      revealed: 'revealed on Dec 25, 2026',
      surprise: 'No spoilers!',
      edit: 'Edit',
      unhide: 'Stop hiding',
      visibleToAll: 'Visible to everyone in your household',
      deleteHousehold: 'Delete this household for everyone',
      deleted: /deleted by one of its members/,
      welcome: 'New household',
    },
  },
] as const;

for (const { lang, host, t } of RUNS) {
  test(`Leo et Emma se cachent leurs cadeaux (${lang}, ${host})`, async () => {
    const shots = `test-results/captures/${lang}`;
    mkdirSync(shots, { recursive: true });
    const leo = await Person.launch('leo', lang, host);
    const emma = await Person.launch('emma', lang, host);

    try {
      await test.step('Leo crée le foyer', async () => {
        const popup = await leo.popup();
        await popup.locator('#name').fill('Leo');
        await popup.getByRole('button', { name: t.create }).click();
        await expect(popup.getByText(t.youAre)).toContainText('Leo');
        await expect(popup.getByText(t.synced)).toBeVisible();
        await popup.screenshot({ path: `${shots}/1-popup-leo.png` });
        await popup.close();
      });

      await test.step('Emma rejoint le foyer avec le code', async () => {
        const code = (await (await leo.popup()).locator('code.invite').textContent())!;
        expect(code.startsWith('PSST-')).toBe(true);
        const popup = await emma.popup();
        await popup.locator('#code').fill(code);
        await popup.getByRole('button', { name: t.join, exact: true }).click();
        await expect(popup.getByRole('heading', { name: t.whoAreYou })).toBeVisible();
        await expect(popup.getByRole('button', { name: 'Leo' })).toBeVisible();
        await popup.locator('#name').fill('Emma');
        await popup.getByRole('button', { name: t.itsMe }).click();
        await expect(popup.getByText(t.youAre)).toContainText('Emma');
        await expect(popup.locator('ul.members')).toContainText('Leo');
        await emma.waitPushed();
      });

      await test.step('Leo cache le coffret à Emma', async () => {
        const page = await leo.openOrders();
        await expect(page.locator('.js-order-card[data-cc-state="shown"]')).toHaveCount(10);
        const tea = card(page, TEA);
        await tea.getByRole('button', { name: t.hideThis }).click();
        await expect(tea.getByRole('checkbox', { name: 'Emma' })).toBeChecked();
        await tea.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${shots}/2-leo-panneau.png` });
        await tea.getByRole('button', { name: t.hide, exact: true }).click();
        await expect(tea.getByText(t.hiddenFromEmma)).toBeVisible();
        await leo.waitPushed();
      });

      let teaId = '';
      let gameId = '';

      await test.step('Emma ne voit pas le coffret, jamais, même une fraction de seconde', async () => {
        const page = await emma.openOrders();
        teaId = await orderIdOf(page, TEA);
        gameId = await orderIdOf(page, GAME);
        await expect(card(page, TEA)).toBeHidden();
        await expect(card(page, GAME)).toBeVisible();
        await expect(page.locator('.js-order-card[data-cc-state="shown"]')).toHaveCount(9);
        expect(await statesOf(page, teaId)).toEqual(['hidden']);

        const game = card(page, GAME);
        await game.getByRole('button', { name: t.hideThis }).click();
        await game.locator('input[type=date]').fill('2026-12-25');
        await game.getByRole('button', { name: t.hide, exact: true }).click();
        await expect(game.getByText(t.hiddenFromLeo)).toBeVisible();
        await expect(game.getByText(t.revealed)).toBeVisible();
        await game.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${shots}/3-emma-liste.png` });
        await emma.waitPushed();
      });

      await test.step('Leo ne voit plus le jeu, et voit toujours son coffret caché', async () => {
        const page = await leo.openOrders();
        await expect(card(page, GAME)).toBeHidden();
        expect(await statesOf(page, gameId)).toEqual(['hidden']);
        await expect(card(page, TEA).getByText(t.hiddenFromEmma)).toBeVisible();
        await card(page, TEA).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${shots}/4-leo-liste.png` });
      });

      await test.step('Le détail d’une commande cachée affiche l’écran « pas de spoiler »', async () => {
        const page = await emma.context.newPage();
        await page.goto(detailsUrl(host, teaId));
        await expect(page.getByRole('heading', { name: t.surprise })).toBeVisible();
        await expect(page.locator('#contenu')).toBeHidden();
        await page.screenshot({ path: `${shots}/5-emma-surprise.png` });

        const own = await emma.context.newPage();
        await own.goto(detailsUrl(host, gameId));
        await expect(own.locator('#contenu')).toBeVisible();
        await expect(own.getByText(t.surprise)).toHaveCount(0);
      });

      await test.step('Leo ne cache plus le coffret : Emma le revoit', async () => {
        const page = await leo.openOrders();
        const tea = card(page, TEA);
        await tea.getByRole('button', { name: t.edit }).click();
        await tea.getByRole('button', { name: t.unhide }).click();
        await expect(tea.getByText(t.visibleToAll)).toBeVisible();
        await leo.waitPushed();

        const seen = await emma.openOrders();
        await expect(card(seen, TEA)).toBeVisible();
      });

      await test.step('Leo supprime le foyer : plus rien sur le serveur, Emma est prévenue', async () => {
        const popup = await leo.popup();
        popup.once('dialog', (d) => d.accept());
        await popup.getByRole('button', { name: t.deleteHousehold }).click();
        await expect(popup.getByRole('heading', { name: t.welcome })).toBeVisible();

        const other = await emma.popup();
        await expect(other.getByText(t.deleted)).toBeVisible();
      });
    } finally {
      await leo.close();
      await emma.close();
    }
  });
}

test('vraie page amazon.com : la commande cachée disparaît chez l’autre', async () => {
  const fixture = 'tests/fixtures/orders.com.html';
  const leo = await Person.launch('leo', 'en', 'www.amazon.com', fixture);
  const emma = await Person.launch('emma', 'en', 'www.amazon.com', fixture);
  try {
    const popup = await leo.popup();
    await popup.locator('#name').fill('Leo');
    await popup.getByRole('button', { name: 'Create' }).click();
    const code = (await popup.locator('code.invite').textContent())!;
    const join = await emma.popup();
    await join.locator('#code').fill(code);
    await join.getByRole('button', { name: 'Join', exact: true }).click();
    await join.locator('#name').fill('Emma');
    await join.getByRole('button', { name: 'That’s me' }).click();
    await emma.waitPushed();

    const page = await leo.openOrders();
    const order = page.locator('.js-order-card');
    await order.getByRole('button', { name: /Hide this order/ }).click();
    await order.getByRole('button', { name: 'Hide', exact: true }).click();
    await expect(order.getByText('Hidden from Emma')).toBeVisible();
    await page.waitForLoadState('load');
    await order.screenshot({ path: 'test-results/captures/amazon-com-leo.png' });
    await leo.waitPushed();

    const seen = await emma.openOrders();
    await expect(seen.locator('.js-order-card')).toBeHidden();
    await expect(seen.locator('.js-order-card[data-cc-state="hidden"]')).toHaveCount(1);
  } finally {
    await leo.close();
    await emma.close();
  }
});
