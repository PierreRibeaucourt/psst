/**
 * Pages qui portent sur une seule commande (détail, suivi de colis, facture, retour…).
 * Si la commande est cachée à la personne devant le navigateur, la page est
 * remplacée par un écran « Pas de spoiler ! ». Les pages sans n° de commande ne sont pas touchées.
 */
import { i18n } from '#i18n';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { COLORS as C, markSvgAt } from '../lib/brand';
import { orderIdFromUrl } from '../lib/dom';
import { ANY_PAGE_MATCHES, LIST_MATCHES } from '../lib/matches';
import { loadFreshState, onStateChange } from '../lib/state';
import { isHiddenForMe } from '../lib/visibility';

const HIDE_PAGE = 'html{visibility:hidden!important}';
const SURPRISE = `${HIDE_PAGE} body{display:none!important}`;

const OVERLAY_CSS = `
:host { all: initial; position: fixed; inset: 0; z-index: 2147483647; visibility: visible;
  display: grid; place-items: center; background: ${C.cream}; font-family: "Amazon Ember", Arial, sans-serif;
  color: ${C.ink}; }
.box { max-width: 440px; padding: 32px 24px; text-align: center; }
h1 { margin: 18px 0 8px; font-size: 28px; color: ${C.navy}; }
p { margin: 0 0 26px; font-size: 15px; line-height: 1.5; color: ${C.muted}; }
a { display: inline-block; padding: 10px 20px; border-radius: 999px; background: ${C.orange}; color: ${C.navy};
  font-weight: 700; font-size: 14px; text-decoration: none; }
a:hover { background: ${C.orangeDeep}; }
a:focus-visible { outline: 2px solid ${C.navy}; outline-offset: 3px; }
`;

function buildOverlay(): HTMLElement {
  const host = document.createElement('psst-surprise');
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = OVERLAY_CSS;
  const box = document.createElement('div');
  box.className = 'box';
  box.setAttribute('role', 'main');
  const mark = document.createElement('div');
  mark.innerHTML = markSvgAt(96);
  const h1 = document.createElement('h1');
  h1.textContent = i18n.t('surprise.title');
  const p = document.createElement('p');
  p.textContent = i18n.t('surprise.text');
  const a = document.createElement('a');
  a.href = `${location.origin}/gp/css/order-history`;
  a.textContent = i18n.t('surprise.back');
  box.append(mark, h1, p, a);
  root.append(style, box);
  return host;
}

export default defineContentScript({
  matches: ANY_PAGE_MATCHES,
  excludeMatches: LIST_MATCHES,
  runAt: 'document_start',
  async main(ctx) {
    const orderId = orderIdFromUrl(location.href);
    if (!orderId) return;

    const style = document.createElement('style');
    style.textContent = HIDE_PAGE;
    document.documentElement.append(style);
    let overlay: HTMLElement | null = null;

    const apply = (hidden: boolean) => {
      if (hidden && !overlay) {
        style.textContent = SURPRISE;
        overlay = buildOverlay();
        document.documentElement.append(overlay);
        const retitle = () => overlay && (document.title = i18n.t('surprise.docTitle'));
        retitle();
        document.addEventListener('DOMContentLoaded', retitle, { once: true }); // la page réécrit son <title>
      } else if (!hidden) {
        overlay?.remove();
        overlay = null;
        style.remove();
      }
    };

    try {
      const state = await loadFreshState();
      apply(isHiddenForMe(state, orderId));
    } catch {
      apply(false);
    }
    ctx.onInvalidated(
      onStateChange((s) => {
        const hidden = isHiddenForMe(s, orderId);
        if (hidden !== !!overlay) {
          if (hidden) location.reload(); // repartir d'une page propre
          else apply(false);
        }
      }),
    );
  },
});
