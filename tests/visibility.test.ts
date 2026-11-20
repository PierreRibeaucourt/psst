import { describe, expect, it } from 'vitest';
import { emptyState, type AppState } from '../src/lib/types';
import { activeHiddenFrom, isHiddenForMe, todayLocal } from '../src/lib/visibility';

// N° de commande inventés.
const TEA = '405-1111111-2222222'; // coffret de thés : Leo l'offre à Emma
const GAME = '403-3333333-4444444'; // jeu de société : Emma l'offre à Leo

function household(me: 'leo' | 'emma'): AppState {
  const s = emptyState();
  s.household = { secret: 'x', createdAt: 0, registered: true };
  s.me = me;
  s.members = {
    leo: { id: 'leo', name: 'Leo', updatedAt: 1 },
    emma: { id: 'emma', name: 'Emma', updatedAt: 1 },
  };
  s.hides = {
    [TEA]: { orderId: TEA, hiddenFrom: ['emma'], by: 'leo', updatedAt: 1 },
    [GAME]: { orderId: GAME, hiddenFrom: ['leo'], by: 'emma', revealAt: '2026-12-25', updatedAt: 1 },
  };
  return s;
}

describe('qui voit quoi', () => {
  const today = '2026-11-20';

  it('Leo ne voit pas le jeu, mais voit le coffret qu’il a lui-même caché', () => {
    const s = household('leo');
    expect(isHiddenForMe(s, GAME, today)).toBe(true);
    expect(isHiddenForMe(s, TEA, today)).toBe(false);
  });

  it('Emma ne voit pas le coffret, mais voit le jeu', () => {
    const s = household('emma');
    expect(isHiddenForMe(s, TEA, today)).toBe(true);
    expect(isHiddenForMe(s, GAME, today)).toBe(false);
  });

  it('une commande redevient visible le jour de sa révélation', () => {
    const s = household('leo');
    expect(isHiddenForMe(s, GAME, '2026-12-24')).toBe(true);
    expect(isHiddenForMe(s, GAME, '2026-12-25')).toBe(false);
  });

  it('un membre retiré du foyer n’est plus compté', () => {
    const s = household('leo');
    s.members.emma!.deleted = true;
    expect(activeHiddenFrom(s, TEA, today)).toEqual([]);
  });

  it('sans identité choisie, rien n’est caché', () => {
    const s = household('leo');
    delete s.me;
    expect(isHiddenForMe(s, GAME, today)).toBe(false);
  });

  it('todayLocal formate la date locale', () => {
    expect(todayLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
