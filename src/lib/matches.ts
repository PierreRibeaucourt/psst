/**
 * Sites Amazon couverts. Même page « Vos commandes » partout ; si une carte ne se
 * lit pas, elle est masquée par précaution (voir orders.content/style.css).
 */
export const AMAZON_HOSTS = [
  'www.amazon.fr',
  'www.amazon.com.be',
  'www.amazon.de',
  'www.amazon.it',
  'www.amazon.es',
  'www.amazon.nl',
  'www.amazon.co.uk',
  'www.amazon.ie',
  'www.amazon.com',
  'www.amazon.ca',
];

const on = (paths: string[]) => AMAZON_HOSTS.flatMap((h) => paths.map((p) => `https://${h}${p}`));

/** Pages qui listent des commandes sous forme de cartes. */
export const LIST_MATCHES = on([
  '/gp/css/order-history*',
  '/gp/your-account/order-history*',
  '/gp/legacy/order-history*',
  '/your-orders/orders*',
  '/your-orders/search*',
]);

/** Toutes les pages : le script vérifie lui-même si l'URL désigne une commande. */
export const ANY_PAGE_MATCHES = on(['/*']);
