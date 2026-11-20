/**
 * Lecture de la page « Vos commandes ». On ne cherche jamais de n° de commande
 * dans toute la page : un identifiant de session Amazon du même format traîne
 * dans les scripts. On lit toujours à l'intérieur d'une carte.
 */

/** 405-1234567-7654321 (physique) ou D01-1234567-7654321 (numérique). */
const ID = '[0-9A-Z]{3}-\\d{7}-\\d{7}';
export const ORDER_ID_RE = new RegExp(`^${ID}$`);
const ID_IN_TEXT = new RegExp(`(?:^|[^0-9A-Z-])(${ID})(?![0-9-])`);
const ID_IN_URL = new RegExp(`[?&]order[Ii][Dd]=(${ID})(?![0-9-])`);
const ID_IN_PATH = new RegExp(`/(${ID})(?=[/?#]|$)`);

export const CARD_SELECTOR = '.js-order-card, .order-card';

export function findOrderCards(root: ParentNode): HTMLElement[] {
  // Une carte ne contient jamais une autre carte : on ne garde que les plus externes.
  const all = Array.from(root.querySelectorAll<HTMLElement>(CARD_SELECTOR));
  return all.filter((el) => !el.parentElement?.closest(CARD_SELECTOR));
}

/** N° de commande d'une carte, ou null s'il n'est pas (encore) lisible. */
export function getOrderId(card: Element): string | null {
  const label = card.querySelector('.yohtmlc-order-id');
  const fromLabel = label?.textContent ? ID_IN_TEXT.exec(label.textContent)?.[1] : undefined;
  if (fromLabel) return fromLabel;
  for (const a of card.querySelectorAll('a[href*="rderI"]')) {
    const m = ID_IN_URL.exec(a.getAttribute('href') ?? '');
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * N° de commande présent dans l'URL d'une page : détail, suivi de colis, facture,
 * retour (`?orderID=…`) ou reçu cadeau (`/gr/<n°>/shipment`).
 */
export function orderIdFromUrl(href: string): string | null {
  const url = href.split('#')[0] ?? '';
  return ID_IN_URL.exec(url)?.[1] ?? ID_IN_PATH.exec(url)?.[1] ?? null;
}

/** Endroit où poser la barre Cache-Cadeau dans une carte. */
export function toolbarAnchor(card: HTMLElement): { parent: HTMLElement; before: Node | null } {
  const header = card.querySelector<HTMLElement>('.order-header');
  if (header?.parentElement) return { parent: header.parentElement, before: header.nextSibling };
  return { parent: card, before: card.firstChild };
}
