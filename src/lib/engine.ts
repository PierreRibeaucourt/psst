/**
 * Logique du service worker : seul endroit qui modifie l'état et qui parle au serveur.
 * Popup et pages Amazon lui envoient des messages (voir Message dans types.ts).
 */
import { i18n } from '#i18n';
import { api, API_URL, ApiError } from './api';
import {
  deriveKeys,
  newSecret,
  parseInviteCode,
  randomId,
  recordId,
  seal,
  unseal,
  type HouseholdKeys,
} from './crypto';
import { ORDER_ID_RE } from './dom';
import { loadState, saveState } from './state';
import { emptyState, type AppState, type Message, type Reply, type SyncPayload } from './types';

class UserError extends Error {}

// --- Accès exclusif à l'état -------------------------------------------------

let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

function mutate<T>(fn: (s: AppState) => T): Promise<T> {
  return exclusive(async () => {
    const s = await loadState();
    const result = fn(s);
    await saveState(s);
    return result;
  });
}

function markPending(s: AppState, key: string) {
  if (!s.sync.pending.includes(key)) s.sync.pending.push(key);
}

/** Horodatage qui passe toujours devant la version précédente, même si une horloge est en avance. */
function nextStamp(prev?: number) {
  return Math.max(Date.now(), (prev ?? 0) + 1);
}

function cleanName(name: string) {
  return name.replace(/\s+/g, ' ').trim().slice(0, 40);
}

// --- Synchro ------------------------------------------------------------------

let keysCache: { secret: string; keys: Promise<HouseholdKeys> } | null = null;
function keysFor(secret: string) {
  if (keysCache?.secret !== secret) keysCache = { secret, keys: deriveKeys(secret) };
  return keysCache.keys;
}

function payloadFor(s: AppState, key: string): SyncPayload | null {
  const id = key.slice(2);
  if (key.startsWith('m:')) {
    const m = s.members[id];
    return m ? { k: 'm', ...m } : null;
  }
  if (key.startsWith('h:')) {
    const h = s.hides[id];
    return h ? { k: 'h', ...h } : null;
  }
  return null;
}

function merge(s: AppState, p: SyncPayload) {
  if (typeof p !== 'object' || !p || typeof p.updatedAt !== 'number') return;
  if (p.k === 'm' && typeof p.id === 'string' && typeof p.name === 'string') {
    const { k: _k, ...m } = p;
    const cur = s.members[m.id];
    if (!cur || m.updatedAt >= cur.updatedAt) s.members[m.id] = m;
  } else if (p.k === 'h' && typeof p.orderId === 'string' && Array.isArray(p.hiddenFrom)) {
    const { k: _k, ...h } = p;
    const cur = s.hides[h.orderId];
    if (!cur || h.updatedAt >= cur.updatedAt) s.hides[h.orderId] = h;
  }
}

async function doSync(): Promise<Reply> {
  const s0 = await loadState();
  const hh = s0.household;
  if (!hh || !API_URL) return { ok: true };
  try {
    const keys = await keysFor(hh.secret);
    if (!hh.registered) {
      await api.createHousehold(keys.householdId, keys.token);
      await mutate((s) => {
        if (s.household?.secret === hh.secret) s.household.registered = true;
      });
    }

    const pushed = new Map<string, number>();
    for (const key of s0.sync.pending) {
      const p = payloadFor(s0, key);
      if (p) {
        const rid = await recordId(keys, key);
        await api.push(keys.householdId, keys.token, rid, await seal(keys, rid, p));
      }
      pushed.set(key, p?.updatedAt ?? -1);
    }

    let cursor = s0.sync.cursor;
    const incoming: SyncPayload[] = [];
    for (let page = 0; page < 50; page++) {
      const { records, more } = await api.pull(keys.householdId, keys.token, cursor);
      for (const r of records) {
        cursor = Math.max(cursor, r.seq);
        try {
          incoming.push(await unseal<SyncPayload>(keys, r.rid, r.blob));
        } catch {
          // Blob illisible (corrompu ou d'une autre version) : ignoré.
        }
      }
      if (!more) break;
    }

    await mutate((s) => {
      if (s.household?.secret !== hh.secret) return; // foyer quitté pendant la synchro
      s.sync.pending = s.sync.pending.filter((key) => {
        const stamp = pushed.get(key);
        if (stamp === undefined) return true; // ajouté pendant la synchro
        if (stamp === -1) return false;
        return payloadFor(s, key)?.updatedAt !== stamp; // modifié pendant la synchro
      });
      for (const p of incoming) merge(s, p);
      s.sync.cursor = cursor;
      s.sync.lastOk = Date.now();
      delete s.sync.lastError;
    });
    return { ok: true };
  } catch (e) {
    // 404 sur un foyer connu du serveur : quelqu'un l'a supprimé. On garde l'état local
    // (les commandes restent cachées) et on le signale ; la personne quitte le foyer elle-même.
    const deleted = e instanceof ApiError && e.status === 404 && hh.registered;
    const error = deleted ? i18n.t('err.householdDeleted') : e instanceof Error ? e.message : String(e);
    await mutate((s) => {
      if (s.household?.secret === hh.secret) s.sync.lastError = error;
    });
    return { ok: false, error };
  }
}

let inflight: Promise<Reply> | null = null;
let again = false;

/** Lance une synchro, ou en programme une de plus si une est déjà en cours. */
export function syncNow(): Promise<Reply> {
  if (inflight) {
    again = true;
    return inflight;
  }
  inflight = (async () => {
    let r: Reply;
    do {
      again = false;
      r = await doSync();
    } while (again);
    return r;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

// --- Actions ------------------------------------------------------------------

async function run(msg: Message): Promise<Reply> {
  switch (msg.type) {
    case 'sync':
      return syncNow();

    case 'household:create': {
      const name = cleanName(msg.name);
      if (!name) throw new UserError(i18n.t('err.enterName'));
      await mutate((s) => {
        if (s.household) throw new UserError(i18n.t('err.alreadyInHousehold'));
        const id = randomId();
        const now = Date.now();
        Object.assign(s, emptyState());
        s.household = { secret: newSecret(), createdAt: now, registered: false };
        s.members[id] = { id, name, updatedAt: now };
        s.me = id;
        markPending(s, `m:${id}`);
      });
      void syncNow();
      return { ok: true };
    }

    case 'household:join': {
      const secret = parseInviteCode(msg.code);
      if (!secret) throw new UserError(i18n.t('err.badCode'));
      if (!API_URL) throw new UserError(i18n.t('err.syncDisabled'));
      if ((await loadState()).household) throw new UserError(i18n.t('err.leaveFirst'));
      const keys = await keysFor(secret);
      try {
        await api.pull(keys.householdId, keys.token, 0);
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 404)) {
          throw new UserError(i18n.t('err.unknownHousehold'));
        }
        throw e;
      }
      await mutate((s) => {
        Object.assign(s, emptyState());
        s.household = { secret, createdAt: Date.now(), registered: true };
      });
      return syncNow();
    }

    case 'household:leave':
      await mutate((s) => {
        Object.assign(s, emptyState());
        delete s.household;
        delete s.me;
      });
      return { ok: true };

    case 'household:delete': {
      const s = await loadState();
      if (s.household && API_URL && s.household.registered) {
        const keys = await keysFor(s.household.secret);
        try {
          await api.deleteHousehold(keys.householdId, keys.token);
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 404)) throw e; // déjà supprimé : on continue
        }
      }
      await mutate((st) => {
        Object.assign(st, emptyState());
        delete st.household;
        delete st.me;
      });
      return { ok: true };
    }

    case 'me:set':
      await mutate((s) => {
        const m = s.members[msg.memberId];
        if (!m || m.deleted) throw new UserError(i18n.t('err.memberGone'));
        s.me = m.id;
      });
      return { ok: true };

    case 'member:add': {
      const name = cleanName(msg.name);
      if (!name) throw new UserError(i18n.t('err.enterAName'));
      await mutate((s) => {
        if (!s.household) throw new UserError(i18n.t('err.createFirst'));
        const taken = Object.values(s.members).some(
          (m) => !m.deleted && m.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'),
        );
        if (taken) throw new UserError(i18n.t('err.nameTaken', [name]));
        const id = randomId();
        s.members[id] = { id, name, updatedAt: Date.now() };
        if (msg.asMe) s.me = id;
        markPending(s, `m:${id}`);
      });
      void syncNow();
      return { ok: true };
    }

    case 'member:remove':
      await mutate((s) => {
        const m = s.members[msg.memberId];
        if (!m) return;
        if (m.id === s.me) throw new UserError(i18n.t('err.cantRemoveSelf'));
        s.members[m.id] = { ...m, deleted: true, updatedAt: nextStamp(m.updatedAt) };
        markPending(s, `m:${m.id}`);
      });
      void syncNow();
      return { ok: true };

    case 'hide:set': {
      if (!ORDER_ID_RE.test(msg.orderId)) throw new UserError(i18n.t('err.badOrder'));
      if (msg.revealAt && !/^\d{4}-\d{2}-\d{2}$/.test(msg.revealAt)) throw new UserError(i18n.t('err.badDate'));
      await mutate((s) => {
        if (!s.household || !s.me) throw new UserError(i18n.t('err.setupFirst'));
        const me = s.me;
        const hiddenFrom = [...new Set(msg.hiddenFrom)].filter(
          (id) => id !== me && s.members[id] && !s.members[id].deleted,
        );
        const prev = s.hides[msg.orderId];
        s.hides[msg.orderId] = {
          orderId: msg.orderId,
          hiddenFrom,
          by: me,
          ...(msg.revealAt && hiddenFrom.length ? { revealAt: msg.revealAt } : {}),
          updatedAt: nextStamp(prev?.updatedAt),
        };
        markPending(s, `h:${msg.orderId}`);
      });
      void syncNow();
      return { ok: true };
    }
  }
}

export async function handleMessage(msg: Message): Promise<Reply> {
  try {
    return await run(msg);
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
