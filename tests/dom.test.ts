// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { findOrderCards, getOrderId, orderIdFromUrl, toolbarAnchor } from '../src/lib/dom';

const fixture = readFileSync(resolve(process.cwd(), 'tests/fixtures/orders.html'), 'utf8');

describe('page « Vos commandes » (fixture)', () => {
  beforeAll(() => {
    document.documentElement.innerHTML = fixture
      .replace(/^[\s\S]*?<html[^>]*>/, '')
      .replace(/<\/html>\s*$/, '')
      .replace(/<link[^>]*>/g, '');
  });

  it('trouve les 10 cartes de la page', () => {
    expect(findOrderCards(document)).toHaveLength(10);
  });

  it('lit un n° de commande distinct dans chaque carte, numérique compris', () => {
    const ids = findOrderCards(document).map(getOrderId);
    expect(ids.every((id) => id && /^[0-9A-Z]{3}-\d{7}-\d{7}$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(10);
    expect(ids.some((id) => id!.startsWith('D01-'))).toBe(true);
  });

  it('le n° lu correspond au lien « détails de la commande » de la même carte', () => {
    for (const card of findOrderCards(document)) {
      const id = getOrderId(card)!;
      const link = card.querySelector('a[href*="order-details"]')?.getAttribute('href') ?? '';
      expect(link).toContain(id);
    }
  });

  it('retrouve les deux cadeaux de l’exemple (coffret de thés, jeu de société)', () => {
    const titles = findOrderCards(document).map((c) => c.textContent ?? '');
    expect(titles.filter((t) => t.includes('Coffret de thés'))).toHaveLength(1);
    expect(titles.filter((t) => t.includes('L’Île aux Lucioles'))).toHaveLength(1);
  });

  it('place la barre juste sous l’en-tête de la commande', () => {
    const card = findOrderCards(document)[0]!;
    const header = card.querySelector('.order-header')!;
    const { parent, before } = toolbarAnchor(card);
    expect(parent).toBe(header.parentElement);
    expect(before).toBe(header.nextSibling);
  });
});

describe('page « Your Orders » d’amazon.com (fixture)', () => {
  beforeAll(() => {
    const com = readFileSync(resolve(process.cwd(), 'tests/fixtures/orders.com.html'), 'utf8');
    document.documentElement.innerHTML = com
      .replace(/^[\s\S]*?<html[^>]*>/, '')
      .replace(/<\/html>\s*$/, '')
      .replace(/<link[^>]*>/g, '');
  });

  it('lit la carte et son n° de commande comme sur amazon.fr', () => {
    const cards = findOrderCards(document);
    expect(cards).toHaveLength(1);
    const id = getOrderId(cards[0]!);
    expect(id).toMatch(/^\d{3}-\d{7}-\d{7}$/);
    expect(cards[0]!.querySelector('a[href*="order-details"]')?.getAttribute('href')).toContain(id);
    expect(toolbarAnchor(cards[0]!).parent.querySelector(':scope > .order-header')).toBeTruthy();
  });
});

describe('lecture du n° de commande', () => {
  it('se rabat sur les liens si le libellé a disparu', () => {
    const card = document.createElement('div');
    card.innerHTML = '<a href="/hz/feedback?ref=x&orderID=405-1234567-7654321">avis</a>';
    expect(getOrderId(card)).toBe('405-1234567-7654321');
  });

  it('ne renvoie rien tant que le n° n’est pas complet', () => {
    const card = document.createElement('div');
    card.innerHTML = '<div class="yohtmlc-order-id"><span>N°</span><span>405-12345</span></div>';
    expect(getOrderId(card)).toBeNull();
  });
});

describe('n° de commande dans l’URL', () => {
  it.each([
    ['https://www.amazon.fr/your-orders/order-details?orderID=405-1234567-7654321&ref=x', '405-1234567-7654321'],
    ['https://www.amazon.fr/gp/css/order-details?orderID=D01-1234567-7654321', 'D01-1234567-7654321'],
    ['https://www.amazon.fr/progress-tracker/package?ref=a&shipmentId=X&orderId=402-1111111-2222222', '402-1111111-2222222'],
    ['https://www.amazon.fr/gcx/-/ty/gr/402-1111111-2222222/shipment?ref=x', '402-1111111-2222222'],
    ['https://www.amazon.fr/dp/B0H4G5MH39', null],
    ['https://www.amazon.fr/your-orders/orders?page=1', null],
  ])('%s', (url, expected) => {
    expect(orderIdFromUrl(url)).toBe(expected);
  });
});
