/**
 * Pages « Vos commandes » et recherche dans les commandes.
 * Le CSS (style.css) masque toutes les cartes dès le départ ; ce script les
 * montre une à une, sauf celles cachées à la personne devant le navigateur.
 */
import './style.css';
import { i18n } from '#i18n';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { ensureBar, removeBar } from '../../lib/card-ui';
import { findOrderCards, getOrderId } from '../../lib/dom';
import { LIST_MATCHES } from '../../lib/matches';
import { loadFreshState, onStateChange } from '../../lib/state';
import type { AppState } from '../../lib/types';
import { isHiddenForMe } from '../../lib/visibility';

/** Délai avant de déclarer illisible une carte sans n° de commande, une fois la page chargée. */
const UNREADABLE_AFTER_MS = 1500;

export default defineContentScript({
  matches: LIST_MATCHES,
  runAt: 'document_start',
  main(ctx) {
    let state: AppState | null = null;
    const waiting = new WeakSet<HTMLElement>();

    const setCardState = (card: HTMLElement, value: string) => {
      if (card.dataset.ccState !== value) card.dataset.ccState = value;
    };

    const processCard = (card: HTMLElement) => {
      if (!state) return;
      if (card.dataset.ccState === 'revealed') return; // illisible affichée à la demande
      const orderId = getOrderId(card);
      if (!orderId) {
        if (document.readyState !== 'loading' && !waiting.has(card)) {
          waiting.add(card);
          ctx.setTimeout(() => {
            if (!getOrderId(card)) {
              card.dataset.ccMsg = i18n.t('bar.unreadable');
              setCardState(card, 'unreadable');
              card.addEventListener('click', () => setCardState(card, 'revealed'), { once: true });
            } else processCard(card);
          }, UNREADABLE_AFTER_MS);
        }
        return;
      }
      card.dataset.ccOrder = orderId;
      if (isHiddenForMe(state, orderId)) {
        removeBar(card);
        setCardState(card, 'hidden');
      } else {
        setCardState(card, 'shown');
        ensureBar(card, orderId, state);
      }
    };

    const processAll = () => {
      for (const card of findOrderCards(document)) processCard(card);
    };

    const observer = new MutationObserver(processAll);
    observer.observe(document, { childList: true, subtree: true });
    ctx.onInvalidated(() => observer.disconnect());
    document.addEventListener('DOMContentLoaded', processAll, { once: true });

    void loadFreshState().then((s) => {
      state = s;
      processAll();
    });
    const stop = onStateChange((s) => {
      state = s;
      processAll();
    });
    ctx.onInvalidated(stop);
  },
});
