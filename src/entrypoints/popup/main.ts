import { i18n } from '#i18n';
import logoDark from '../../../brand/logo-reverse.svg?raw';
import logoLight from '../../../brand/logo.svg?raw';
import { API_URL } from '../../lib/api';
import { inviteCode } from '../../lib/crypto';
import { timeAgo, uiLang } from '../../lib/locale';
import { loadState, onStateChange, send } from '../../lib/state';
import type { AppState, Message } from '../../lib/types';
import { activeMembers } from '../../lib/visibility';

document.documentElement.lang = uiLang();
document.getElementById('logo')!.innerHTML =
  `<span class="logo-light">${logoLight}</span><span class="logo-dark">${logoDark}</span>`;

const app = document.getElementById('app')!;
let state: AppState;
let error = '';
let picking = false;
let busy = false;

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

async function act(msg: Message, after?: () => void) {
  busy = true;
  error = '';
  render();
  const reply = await send(msg);
  busy = false;
  if (reply.ok) after?.();
  else error = reply.error;
  state = await loadState();
  render();
}

/** Champ texte + bouton, validés aussi avec Entrée. */
function inputRow(placeholder: string, label: string, onSubmit: (v: string) => void, id: string) {
  const input = el('input', { type: 'text', placeholder, id, maxLength: id === 'code' ? 80 : 40 });
  input.setAttribute('aria-label', placeholder);
  const go = () => input.value.trim() && onSubmit(input.value);
  input.addEventListener('keydown', (e) => e.key === 'Enter' && go());
  return el('div', { class: 'row' }, input, el('button', { class: 'primary', textContent: label, disabled: busy, onclick: go }));
}

function viewWelcome() {
  return [
    el('p', { class: 'muted' }, i18n.t('popup.tagline')),
    el(
      'section',
      {},
      el('h2', {}, i18n.t('popup.newHousehold')),
      el('p', {}, i18n.t('popup.newHouseholdHelp')),
      inputRow(i18n.t('popup.yourName'), i18n.t('popup.create'), (name) => act({ type: 'household:create', name }), 'name'),
    ),
    el('div', { class: 'or' }, i18n.t('popup.or')),
    el(
      'section',
      {},
      el('h2', {}, i18n.t('popup.join')),
      API_URL ? el('p', {}, i18n.t('popup.joinHelp')) : el('p', { class: 'muted' }, i18n.t('err.syncDisabled')),
      API_URL
        ? inputRow(i18n.t('popup.inviteCode'), i18n.t('popup.joinButton'), (code) => act({ type: 'household:join', code }), 'code')
        : null,
    ),
  ];
}

function viewPickMe() {
  const members = activeMembers(state);
  return [
    el(
      'section',
      {},
      el('h2', {}, i18n.t('popup.whoAreYou')),
      el('p', { class: 'muted' }, i18n.t('popup.whoHelp')),
      el(
        'div',
        { class: 'pick' },
        ...members.map((m) =>
          el('button', {
            textContent: m.id === state.me ? i18n.t('popup.current', [m.name]) : m.name,
            disabled: busy,
            onclick: () => act({ type: 'me:set', memberId: m.id }, () => (picking = false)),
          }),
        ),
      ),
      el('p', { class: 'muted' }, members.length ? i18n.t('popup.notListed') : i18n.t('popup.enterName')),
      inputRow(
        i18n.t('popup.yourName'),
        i18n.t('popup.itsMe'),
        (name) => act({ type: 'member:add', name, asMe: true }, () => (picking = false)),
        'name',
      ),
      state.me
        ? el('button', { class: 'link', textContent: i18n.t('popup.cancel'), onclick: () => ((picking = false), render()) })
        : null,
    ),
  ];
}

function viewHousehold() {
  const me = state.members[state.me!]!;
  const members = activeMembers(state);
  const myHides = Object.values(state.hides).filter((h) => h.by === state.me && h.hiddenFrom.length).length;
  const s = state.sync;

  const status = !API_URL
    ? el('span', { class: 'muted' }, i18n.t('popup.localMode'))
    : s.lastError
      ? el('span', { class: 'status-warn' }, `⚠ ${i18n.t('popup.syncError', [s.lastError])}`)
      : s.lastOk
        ? el('span', { class: 'status-ok' }, `✓ ${i18n.t('popup.synced', [timeAgo(s.lastOk, i18n.t('popup.justNow'))])}`)
        : el('span', { class: 'muted' }, i18n.t('popup.syncing'));

  const code = inviteCode(state.household!.secret);
  const copy = el('button', {
    textContent: i18n.t('popup.copy'),
    onclick: async () => {
      await navigator.clipboard.writeText(code);
      copy.textContent = i18n.t('popup.copied');
    },
  });

  return [
    el(
      'p',
      {},
      `${i18n.t('popup.youAre')} `,
      el('strong', {}, me.name),
      ' · ',
      el('button', { class: 'link', textContent: i18n.t('popup.change'), onclick: () => ((picking = true), render()) }),
    ),
    el(
      'section',
      {},
      el('h2', {}, i18n.t('popup.household')),
      el(
        'ul',
        { class: 'members' },
        ...members.map((m) =>
          el(
            'li',
            {},
            el('span', {}, m.name, m.id === state.me ? el('span', { class: 'me-tag' }, i18n.t('popup.you')) : null),
            m.id === state.me
              ? null
              : el('button', {
                  class: 'link danger',
                  textContent: i18n.t('popup.remove'),
                  disabled: busy,
                  onclick: () =>
                    confirm(i18n.t('popup.removeConfirm', [m.name])) && act({ type: 'member:remove', memberId: m.id }),
                }),
          ),
        ),
      ),
      inputRow(i18n.t('popup.addPlaceholder'), i18n.t('popup.add'), (name) => act({ type: 'member:add', name }), 'add'),
    ),
    API_URL
      ? el(
          'section',
          {},
          el('h2', {}, i18n.t('popup.invite')),
          el('p', { class: 'muted' }, i18n.t('popup.inviteHelp')),
          el('code', { class: 'invite', textContent: code }),
          copy,
        )
      : null,
    el('p', { class: 'muted' }, myHides ? i18n.t('popup.hiddenCount', myHides) : i18n.t('popup.howTo')),
    el(
      'footer',
      {},
      status,
      el('button', {
        class: 'link danger',
        textContent: i18n.t('popup.leave'),
        onclick: () => confirm(i18n.t('popup.leaveConfirm')) && act({ type: 'household:leave' }),
      }),
    ),
    API_URL
      ? el(
          'p',
          { class: 'danger-zone' },
          el('button', {
            class: 'link danger',
            textContent: i18n.t('popup.delete'),
            disabled: busy,
            onclick: () => confirm(i18n.t('popup.deleteConfirm')) && act({ type: 'household:delete' }),
          }),
        )
      : null,
  ];
}

function render() {
  const view = !state.household
    ? viewWelcome()
    : picking || !state.me || !state.members[state.me] || state.members[state.me]!.deleted
      ? viewPickMe()
      : viewHousehold();
  const focused = document.activeElement instanceof HTMLInputElement ? document.activeElement : null;
  const keep = focused ? { id: focused.id, value: focused.value } : null;
  app.replaceChildren(
    ...view.filter((n): n is HTMLElement => !!n),
    error ? el('p', { class: 'error', role: 'alert' }, error) : '',
  );
  if (keep) {
    const input = document.getElementById(keep.id);
    if (input instanceof HTMLInputElement) {
      input.value = keep.value;
      input.focus();
    }
  }
}

void (async () => {
  state = await loadState();
  render();
  onStateChange((s) => {
    state = s;
    render();
  });
  if (state.household) void send({ type: 'sync' });
})();
