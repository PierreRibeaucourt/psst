/** Charte Psst (voir brand/charte.html). */
import markSvg from '../../brand/mark.svg?raw';

export const COLORS = {
  navy: '#1B2738',
  navySoft: '#2E3D55',
  orange: '#FF9F1C',
  orangeDeep: '#E8850C',
  cream: '#FFF6E9',
  sand: '#F3E2C7',
  ink: '#0F1720',
  muted: '#5B6472',
  danger: '#B3261E',
} as const;

/** Logo (bulle-cadeau) à la taille voulue, à insérer tel quel dans un shadow DOM. */
export function markSvgAt(size: number): string {
  return markSvg.replace('<svg ', `<svg width="${size}" height="${size}" aria-hidden="true" `);
}
