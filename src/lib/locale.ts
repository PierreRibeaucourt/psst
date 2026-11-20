/** Mise en forme selon la langue de Chrome (celle que suit browser.i18n). */
import { browser } from 'wxt/browser';

export function uiLang(): string {
  try {
    return browser.i18n.getUILanguage() || 'en';
  } catch {
    return 'en';
  }
}

/** « Emma et Leo » / « Emma and Leo ». */
export function joinNames(names: string[]): string {
  return new Intl.ListFormat(uiLang(), { style: 'long', type: 'conjunction' }).format(names);
}

/** Date AAAA-MM-JJ → « 25 déc. 2026 » / « Dec 25, 2026 ». */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(uiLang(), { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(y!, m! - 1, d!),
  );
}

/** « il y a 2 minutes » / « 2 minutes ago ». */
export function timeAgo(ts: number, justNow: string): string {
  const s = Math.round((ts - Date.now()) / 1000);
  if (s > -60) return justNow;
  const rtf = new Intl.RelativeTimeFormat(uiLang(), { numeric: 'auto' });
  const m = Math.round(s / 60);
  if (m > -60) return rtf.format(m, 'minute');
  const h = Math.round(m / 60);
  return h > -24 ? rtf.format(h, 'hour') : rtf.format(Math.round(h / 24), 'day');
}
