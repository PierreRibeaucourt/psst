import { describe, expect, it } from 'vitest';
import {
  deriveKeys,
  inviteCode,
  newSecret,
  parseInviteCode,
  recordId,
  seal,
  unseal,
} from '../src/lib/crypto';

describe('chiffrement du foyer', () => {
  it('deux navigateurs avec le même code dérivent les mêmes identifiants', async () => {
    const secret = newSecret();
    const a = await deriveKeys(secret);
    const b = await deriveKeys(parseInviteCode(inviteCode(secret))!);
    expect(a.householdId).toBe(b.householdId);
    expect(a.token).toBe(b.token);
    expect(await recordId(a, 'h:405-1111111-2222222')).toBe(await recordId(b, 'h:405-1111111-2222222'));
  });

  it('le serveur ne voit ni le n° de commande ni les prénoms', async () => {
    const keys = await deriveKeys(newSecret());
    const rid = await recordId(keys, 'h:405-1111111-2222222');
    const blob = await seal(keys, rid, { k: 'h', orderId: '405-1111111-2222222', hiddenFrom: ['Emma'] });
    expect(rid).not.toContain('405');
    expect(blob).not.toMatch(/405|Emma/);
    expect(await unseal(keys, rid, blob)).toMatchObject({ orderId: '405-1111111-2222222' });
  });

  it('un blob déplacé sur un autre enregistrement est refusé', async () => {
    const keys = await deriveKeys(newSecret());
    const rid1 = await recordId(keys, 'h:1');
    const rid2 = await recordId(keys, 'h:2');
    const blob = await seal(keys, rid1, { x: 1 });
    await expect(unseal(keys, rid2, blob)).rejects.toThrow();
  });

  it('un autre foyer ne peut pas déchiffrer', async () => {
    const a = await deriveKeys(newSecret());
    const b = await deriveKeys(newSecret());
    const rid = await recordId(a, 'h:1');
    await expect(unseal(b, rid, await seal(a, rid, { x: 1 }))).rejects.toThrow();
  });

  it('le code d’invitation tolère espaces et retours à la ligne, et refuse le reste', () => {
    const secret = newSecret();
    const code = inviteCode(secret);
    expect(parseInviteCode(`  ${code.slice(0, 20)}\n${code.slice(20)} `)).toBe(secret);
    expect(parseInviteCode(secret)).toBe(secret);
    expect(parseInviteCode(`CC1-${secret}`)).toBe(secret); // codes de la première version
    expect(code.startsWith('PSST-')).toBe(true);
    expect(parseInviteCode('PSST-trop-court')).toBeNull();
  });
});
