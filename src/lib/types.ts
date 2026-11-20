/** Une personne du foyer. Chacune utilise son propre profil Chrome. */
export interface Member {
  id: string;
  name: string;
  updatedAt: number;
  deleted?: boolean;
}

/**
 * Une commande cachée. `hiddenFrom` vide = plus cachée (on garde l'enregistrement
 * pour que la levée du masquage se synchronise aussi).
 */
export interface HideRecord {
  orderId: string;
  hiddenFrom: string[];
  by: string;
  /** Date locale AAAA-MM-JJ à partir de laquelle la commande redevient visible. */
  revealAt?: string;
  updatedAt: number;
}

export interface Household {
  /** Secret du foyer (32 octets en base64url). Il ne quitte jamais les navigateurs du foyer. */
  secret: string;
  createdAt: number;
  /** Le serveur connaît-il déjà ce foyer ? */
  registered: boolean;
}

export interface SyncMeta {
  cursor: number;
  /** Clés à pousser : `m:<memberId>` ou `h:<orderId>`. */
  pending: string[];
  lastOk?: number;
  lastError?: string;
}

export interface AppState {
  household?: Household;
  me?: string;
  members: Record<string, Member>;
  hides: Record<string, HideRecord>;
  sync: SyncMeta;
}

export const emptyState = (): AppState => ({
  members: {},
  hides: {},
  sync: { cursor: 0, pending: [] },
});

/** Ce qui transite chiffré par le serveur. */
export type SyncPayload =
  | ({ k: 'm' } & Member)
  | ({ k: 'h' } & HideRecord);

export type Message =
  | { type: 'sync' }
  | { type: 'household:create'; name: string }
  | { type: 'household:join'; code: string }
  | { type: 'household:leave' }
  | { type: 'household:delete' }
  | { type: 'me:set'; memberId: string }
  | { type: 'member:add'; name: string; asMe?: boolean }
  | { type: 'member:remove'; memberId: string }
  | { type: 'hide:set'; orderId: string; hiddenFrom: string[]; revealAt?: string };

export type Reply = { ok: true; data?: unknown } | { ok: false; error: string };
