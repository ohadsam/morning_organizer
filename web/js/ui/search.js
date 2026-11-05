// Global search: one box that finds any feature (or routine) and takes you straight there.
import { h, setChildren } from '../util.js';
import { t } from '../i18n.js';
import * as S from '../store.js';
import { search } from '../searchIndex.js';
import { modal } from './common.js';
import { go } from './actions.js';

/** Features that can be switched off in settings are hidden from the results when they are off. */
const NEED_ID = { goals: 'goals', retros: 'retros', aprt: 'aprt', stats: 'stats', report: 'reports', family: 'family' };
function hasFeature(id) { if (NEED_ID[id] && !S.shows(NEED_ID[id])) return false; const f = S.features(); return id === 'calm' ? f.calmCorner !== false : id === 'journal' || id === 'note' ? f.journal !== false : id === 'rewards' ? f.rewardMenu !== false && S.shows('rewards') : true; }

export function openSearch(nav) {
  let m; const routines = () => S.get().templates.map((x) => ({ id: x.id, name: x.name, icon: x.icon }));
  const list = h('ul', { class: 'search-results', 'aria-label': t('searchTitle') }), live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  const input = h('input', { type: 'search', class: 'search-input', placeholder: t('searchPh'), 'aria-label': t('searchTitle'), autocomplete: 'off', enterkeyhint: 'go', maxLength: 60 });
  const sub = h('h3', { class: 'search-sub' }, t('searchTry'));
  let results = [];
  const pick = (r) => { m.close(); go(r.go, nav); };
  const draw = () => {
    results = search(input.value, { t, routines: routines(), has: hasFeature, limit: 8 });
    setChildren(list, results.map((r) => h('li', {}, h('button', { class: 'btn search-item', type: 'button', onclick: () => pick(r) }, h('span', { class: 'si-i', 'aria-hidden': 'true' }, r.icon), h('span', { class: 'si-t' }, r.title)))),
      !results.length ? h('li', { class: 'empty' }, t('searchNone')) : null);
    sub.hidden = !!input.value.trim();
    live.textContent = input.value.trim() ? (results.length ? `${results.length}` : t('searchNone')) : '';
  };
  input.addEventListener('input', draw);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && results[0]) { e.preventDefault(); pick(results[0]); }
    if (e.key === 'ArrowDown') { e.preventDefault(); list.querySelector('button')?.focus(); }
    if (e.key === 'Escape') { e.preventDefault(); m.close(); }   // a search box would otherwise just clear itself on the first Escape
  });
  list.addEventListener('keydown', (e) => {
    const bs = [...list.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && i < bs.length - 1) { e.preventDefault(); bs[i + 1].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? bs[i - 1] : input).focus(); }
  });
  m = modal(t('searchTitle'), h('div', { class: 'stack' }, input, h('small', { class: 'hint' }, t('searchHint')), live, sub, list), [{ label: t('close') }]);
  m.el.classList.add('search-modal'); draw(); input.focus();
  return m;
}
