import type { AppState, HideRecord } from './types';

/** Date locale du jour au format AAAA-MM-JJ. */
export function todayLocal(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** La date de révélation est-elle passée ? */
export function isRevealed(rec: HideRecord, today = todayLocal()): boolean {
  return !!rec.revealAt && today >= rec.revealAt;
}

/** Membres (encore dans le foyer) à qui la commande est cachée aujourd'hui. */
export function activeHiddenFrom(state: AppState, orderId: string, today = todayLocal()): string[] {
  const rec = state.hides[orderId];
  if (!rec || isRevealed(rec, today)) return [];
  return rec.hiddenFrom.filter((id) => state.members[id] && !state.members[id].deleted);
}

/** Faut-il cacher cette commande à la personne devant ce navigateur ? */
export function isHiddenForMe(state: AppState, orderId: string, today = todayLocal()): boolean {
  return !!state.me && activeHiddenFrom(state, orderId, today).includes(state.me);
}

export function activeMembers(state: AppState) {
  return Object.values(state.members)
    .filter((m) => !m.deleted)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}
