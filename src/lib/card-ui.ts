/** Barre Psst ajoutée sous l'en-tête de chaque commande visible. Isolée dans un shadow DOM. */
import { i18n } from '#i18n';
import { COLORS as C, markSvgAt } from './brand';
import { toolbarAnchor } from './dom';
import { formatDay, joinNames } from './locale';
import { send } from './state';
import type { AppState } from './types';
import { activeHiddenFrom, activeMembers, todayLocal } from './visibility';

const TAG = 'psst-bar';

interface BarHost extends HTMLElement {
  ccKey?: string;
  ccOpen?: boolean;
  ccBusy?: boolean;
  ccMsg?: string;
  ccState?: AppState;
  ccOrder?: string;
}

const CSS = `
:host { all: initial; display: block; font-family: "Amazon Ember", Arial, sans-serif; font-size: 13px;
  line-height: 1.4; color: ${C.ink}; border-left: 1px solid #d5d9d9; border-right: 1px solid #d5d9d9;
  background: ${C.cream}; }
* { box-sizing: border-box; font: inherit; }
.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; padding: 7px 18px;
  border-bottom: 1px solid ${C.sand}; }
.mark { display: inline-flex; flex: none; }
.state { color: ${C.muted}; }
.badge { color: ${C.navy}; font-weight: 700; }
.muted { color: ${C.muted}; font-weight: 400; }
.spacer { flex: 1; }
button { cursor: pointer; border-radius: 999px; padding: 4px 13px; border: 1px solid #d5d9d9;
  background: #fff; color: ${C.navy}; box-shadow: 0 1px 2px rgba(15, 23, 32, .08); }
button:hover { background: #f7fafa; border-color: #c2c8c8; }
button.primary { background: ${C.orange}; border-color: ${C.orange}; font-weight: 700; }
button.primary:hover { background: ${C.orangeDeep}; border-color: ${C.orangeDeep}; }
button:disabled { opacity: .6; cursor: default; }
button:focus-visible, input:focus-visible { outline: 2px solid ${C.navy}; outline-offset: 2px; }
.panel { display: grid; gap: 10px; padding: 10px 18px 14px; border-bottom: 1px solid ${C.sand}; }
.who { display: flex; flex-wrap: wrap; gap: 6px 16px; }
label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
input[type=checkbox] { width: 16px; height: 16px; accent-color: ${C.navy}; margin: 0; }
input[type=date] { padding: 3px 6px; border: 1px solid #b7b7b7; border-radius: 6px; background: #fff; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.err { color: ${C.danger}; }
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  ...children: (Node | string | null | false)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { class: cls, ...rest } = props;
  if (cls) node.className = cls;
  Object.assign(node, rest);
  for (const c of children) if (c) node.append(c);
  return node;
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return todayLocal(d);
}

export function ensureBar(card: HTMLElement, orderId: string, state: AppState) {
  let host = card.querySelector<BarHost>(TAG);
  if (!host) {
    host = document.createElement(TAG) as BarHost;
    host.attachShadow({ mode: 'open' });
    const { parent, before } = toolbarAnchor(card);
    parent.insertBefore(host, before);
  }
  host.ccState = state;
  host.ccOrder = orderId;
  const key = JSON.stringify([
    orderId,
    state.me,
    !!state.household,
    state.members,
    state.hides[orderId],
    host.ccOpen,
    host.ccBusy,
    host.ccMsg,
    todayLocal(),
  ]);
  if (host.ccKey === key) return;
  host.ccKey = key;
  render(host, orderId, state);
}

export function removeBar(card: HTMLElement) {
  card.querySelector(TAG)?.remove();
}

function rerender(host: BarHost) {
  host.ccKey = undefined;
  if (host.ccState && host.ccOrder) render(host, host.ccOrder, host.ccState);
}

function render(host: BarHost, orderId: string, state: AppState) {
  const root = host.shadowRoot!;
  const me = state.me;
  const rec = state.hides[orderId];
  const hiddenFrom = activeHiddenFrom(state, orderId);
  const names = hiddenFrom.map((id) => state.members[id]!.name);
  const others = activeMembers(state).filter((m) => m.id !== me);
  const byOther = rec && rec.by !== me && state.members[rec.by] ? state.members[rec.by]!.name : null;

  const toggle = el('button', {
    type: 'button',
    textContent: host.ccOpen ? i18n.t('bar.close') : names.length ? i18n.t('bar.edit') : i18n.t('bar.hide'),
    onclick: () => {
      host.ccOpen = !host.ccOpen;
      host.ccMsg = undefined;
      rerender(host);
    },
  });
  toggle.setAttribute('aria-expanded', String(!!host.ccOpen));

  const mark = el('span', { class: 'mark' });
  mark.innerHTML = markSvgAt(18);

  const extras = [
    rec?.revealAt && names.length ? i18n.t('bar.revealOn', [formatDay(rec.revealAt)]) : null,
    byOther ? i18n.t('bar.by', [byOther]) : null,
  ].filter(Boolean);

  const bar = el(
    'div',
    { class: 'bar' },
    mark,
    names.length
      ? el(
          'span',
          { class: 'badge' },
          i18n.t('bar.hiddenFrom', [joinNames(names)]),
          extras.length ? el('span', { class: 'muted' }, ` · ${extras.join(' · ')}`) : null,
        )
      : el('span', { class: 'state' }, i18n.t('bar.visibleToAll')),
    el('span', { class: 'spacer' }),
    toggle,
  );

  root.replaceChildren(el('style', { textContent: CSS }), bar);
  if (!host.ccOpen) return;

  const panel = el('div', { class: 'panel' });
  root.append(panel);

  if (!state.household || !me) {
    panel.append(el('div', {}, i18n.t('panel.setupFirst')));
    return;
  }
  if (!others.length) {
    panel.append(el('div', {}, i18n.t('panel.nobodyElse')));
    return;
  }

  const preset = names.length ? new Set(hiddenFrom) : new Set(others.map((m) => m.id));
  const boxes = others.map((m) => {
    const input = el('input', { type: 'checkbox', value: m.id, checked: preset.has(m.id) });
    return { input, label: el('label', {}, input, m.name) };
  });
  const date = el('input', { type: 'date', min: tomorrow(), value: rec?.revealAt && names.length ? rec.revealAt : '' });

  const save = async (hiddenFromIds: string[]) => {
    host.ccBusy = true;
    rerender(host);
    const reply = await send({
      type: 'hide:set',
      orderId,
      hiddenFrom: hiddenFromIds,
      revealAt: date.value || undefined,
    });
    host.ccBusy = false;
    if (reply.ok) {
      host.ccOpen = false;
      host.ccMsg = undefined;
    } else {
      host.ccMsg = reply.error;
    }
    rerender(host);
  };

  const primary = el('button', {
    type: 'button',
    className: 'primary',
    disabled: !!host.ccBusy,
    textContent: names.length ? i18n.t('panel.save') : i18n.t('panel.hide'),
    onclick: () => {
      const ids = boxes.filter((b) => b.input.checked).map((b) => b.input.value);
      if (!ids.length) {
        host.ccMsg = i18n.t('panel.pickSomeone');
        rerender(host);
        return;
      }
      void save(ids);
    },
  });

  panel.append(
    el('div', {}, i18n.t('panel.hideFrom')),
    el('div', { class: 'who' }, ...boxes.map((b) => b.label)),
    el('label', {}, i18n.t('panel.revealAuto'), date, el('span', { class: 'muted' }, i18n.t('panel.optional'))),
    el(
      'div',
      { class: 'actions' },
      primary,
      names.length
        ? el('button', {
            type: 'button',
            disabled: !!host.ccBusy,
            textContent: i18n.t('panel.unhide'),
            onclick: () => void save([]),
          })
        : null,
    ),
    host.ccMsg ? el('div', { class: 'err', role: 'alert' }, host.ccMsg) : '',
  );
}
