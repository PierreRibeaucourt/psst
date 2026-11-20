import { i18n } from '#i18n';
import { browser } from 'wxt/browser';
import { emptyState, type AppState, type Message, type Reply } from './types';

const KEY = 'cc';

export async function loadState(): Promise<AppState> {
  const got = await browser.storage.local.get(KEY);
  return { ...emptyState(), ...(got[KEY] as Partial<AppState> | undefined) };
}

export async function saveState(state: AppState): Promise<void> {
  await browser.storage.local.set({ [KEY]: state });
}

export function onStateChange(cb: (state: AppState) => void): () => void {
  const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && KEY in changes) {
      cb({ ...emptyState(), ...(changes[KEY]?.newValue as Partial<AppState> | undefined) });
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

/** Envoie une action au service worker, seul à écrire l'état. */
export async function send(msg: Message): Promise<Reply> {
  try {
    const reply = (await browser.runtime.sendMessage(msg)) as Reply | undefined;
    return reply ?? { ok: false, error: i18n.t('err.noResponse') };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * État à jour pour décider quoi montrer. Si le foyer est synchronisé, on attend
 * une synchro fraîche (bornée dans le temps) : sinon une commande cachée il y a
 * deux minutes sur un autre navigateur pourrait s'afficher le temps d'un éclair.
 */
export async function loadFreshState(timeoutMs = 2500): Promise<AppState> {
  const state = await loadState();
  if (!state.household) return state;
  await Promise.race([send({ type: 'sync' }), new Promise((r) => setTimeout(r, timeoutMs))]);
  return loadState();
}
