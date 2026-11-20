/**
 * Version anglaise (façon amazon.com) de la fixture, pour les visuels du Store uniquement :
 * libellés Amazon, dates, prix et titres (fictifs) traduits.
 *
 *   node scripts/make-fixture-en.mjs   → store/fixtures/orders.en.html
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CATALOG } from './demo-catalog.mjs';

let html = readFileSync('tests/fixtures/orders.html', 'utf8');

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const M = MONTHS.join('|');
const en = (m) => EN[MONTHS.indexOf(m)];

// Titres fictifs (scripts/demo-catalog.mjs) : français → anglais.
const TITLES = CATALOG.flat().map((item) => [item.fr, item.en]);

const LABELS = [
  ['Commande effectuée le', 'Order placed'],
  ['Abonnement facturé le', 'Subscription charged on'],
  ['Livraison à', 'Ship to'],
  ['Destinataire', 'Emma R.'],
  ['Commandé par', 'Ordered by'],
  ['N° de commande', 'Order #'],
  ['Afficher des détails de commande', 'View order details'],
  ['Facture', 'Invoice'],
  ['Livraison prévue demain', 'Arriving tomorrow'],
  ['Suivez le colis', 'Track package'],
  ['Retour, remplacement ou rétractation', 'Return or replace items'],
  ['Retour ou rétractation', 'Return or replace items'],
  ['Partager le reçu de l’article', 'Share gift receipt'],
  ['Poser une question sur le produit', 'Ask Product Question'],
  ['Écrire un commentaire sur le produit', 'Write a product review'],
  ['Plus d&#39;options', 'More options'],
  ["Plus d'options", 'More options'],
  ['Gérez votre abonnement', 'Manage your subscription'],
  ['Obtenir l’aide du support produit', 'Get product support'],
  ['Évaluer un vendeur', 'Leave seller feedback'],
  ['Problème avec la commande', 'Problem with order'],
  ['Acheter à nouveau', 'Buy it again'],
  ['Votre colis a été déposé dans la boîte aux lettres.', 'Your package was left in the mailbox.'],
  ['Le colis a été remis en main propre à l&#39;adresse de livraison.', 'Package was handed directly to a resident.'],
  ['Vos commandes', 'Your Orders'],
  ['Votre compte', 'Your Account'],
  ['En attente d&#39;expédition', 'Not Yet Shipped'],
  ['Rechercher', 'Search Orders'],
  ['>Commandes<', '>Orders<'],
  ['45 commandes', '45 orders'],
  ['passées', 'placed in'],
  ['dans les 30 derniers jours', 'the past 30 days'],
  ['les 3 derniers mois', 'past 3 months'],
  ['Afficher les transactions', 'View transactions'],
  ['Précédente', 'Previous'],
  ['Suivante', 'Next'],
  ['Retour terminé', 'Return complete'],
];

for (const [fr, to] of [...TITLES, ...LABELS]) html = html.split(fr).join(to);

html = html
  .replace(/Éligible jusqu(?:'|&#39;)au (\d{1,2}) (\w+) (\d{4})/g, (s, d, m, y) => (en(m) ? `Eligible through ${en(m)} ${d}, ${y}` : s))
  .replace(new RegExp(`Fenêtre de retour fermée le (\\d{1,2}) (${M}) (\\d{4})`, 'g'), (_, d, m, y) => `Return window closed on ${en(m)} ${d}, ${y}`)
  .replace(new RegExp(`Date d(?:'|&#39;)arrivée estimée d’ici le (\\d{1,2}) (${M})`, 'g'), (_, d, m) => `Arriving by ${en(m)} ${d}`)
  .replace(new RegExp(`Livré : (\\d{1,2}) (${M})`, 'g'), (_, d, m) => `Delivered ${en(m)} ${d}`)
  .replace(new RegExp(`(\\d{1,2}) (${M}) (\\d{4})`, 'g'), (_, d, m, y) => `${en(m)} ${d}, ${y}`)
  .replace(/(\d+),(\d{2})(?:&nbsp;| |\s)?€/g, '$$$1.$2')
  .replace('lang="fr-fr"', 'lang="en-us"')
  .split('Your Orders_files/').join('Vos commandes_files/'); // chemins des styles de l'export, pas du texte

mkdirSync('store/fixtures', { recursive: true });
writeFileSync('store/fixtures/orders.en.html', html);
console.log('store/fixtures/orders.en.html écrit');
