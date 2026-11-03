// Template library UI: pick ready-made or saved tasks/routines with big, easy tiles; manage, rename, share and delete your templates.
import { h, setChildren, fmtHuman } from '../util.js';
import { t, units } from '../i18n.js';
import * as S from '../store.js';
import { IDEA_TASKS, CATS, stepsSec } from '../library.js';
import { suggestIcon, PICKER_ICONS } from '../taskIcons.js';
import { modal, toast, confirmBox, icon } from './common.js';
import { timeField } from './timePicker.js';
import { openShare } from './share.js';

const dur = (sec) => fmtHuman(sec, units());
const norm = (s) => String(s || '').toLowerCase();
/** One big tappable tile: emoji, name, small line. */
const tile = (emoji, name, meta, onclick, extra = {}) => h('button', { class: 'tile-btn', type: 'button', onclick, ...extra }, h('span', { class: 'tb-emoji', 'aria-hidden': 'true' }, emoji), h('strong', {}, name), meta ? h('small', {}, meta) : null);

function chipRow(label, items, cur, set) {
  return h('div', { class: 'chips filter', role: 'group', 'aria-label': label }, items.map(([v, txt]) => h('button', { class: `chip btn-chip ${cur() === v ? 'on' : ''}`, type: 'button', 'aria-pressed': String(cur() === v), onclick: () => set(v) }, txt)));
}

/** Pick tasks to add to the routine being edited. onAdd(task) is called for every tap; the sheet stays open so several can be added. */
export function openTaskPicker(onAdd) {
  let cat = 'all', q = '', added = 0;
  const search = h('input', { type: 'search', placeholder: t('libSearch'), 'aria-label': t('libSearch'), oninput: (e) => { q = e.target.value; draw(); } });
  const chips = h('div', {}), grid = h('div', { class: 'tiles-grid' }), status = h('p', { class: 'note', role: 'status', 'aria-live': 'polite' }, '');
  const items = () => {
    const mine = S.library().tasks.map((e) => ({ name: e.name, icon: e.icon || suggestIcon(e.name), sec: e.sec, est: e.est, photo: e.photo, mine: true, cat: 'mine' }));
    const ideas = IDEA_TASKS.map((i) => ({ name: t(i.key), icon: suggestIcon(t(i.key)), sec: i.sec, est: 0, photo: '', mine: false, cat: i.cat }));
    return [...mine, ...ideas].filter((x) => (cat === 'all' || x.cat === cat) && (!q || norm(x.name).includes(norm(q))));
  };
  function draw() {
    setChildren(chips, chipRow(t('libCategory'), [['all', t('libAll')], ['mine', `⭐ ${t('libMine')}`], ...CATS.map((c) => [c, t(`cat2_${c}`)])], () => cat, (v) => { cat = v; draw(); }));
    const list = items();
    setChildren(grid, list.length ? list.map((x) => tile(x.photo ? '' : x.icon, x.name, dur(x.sec), () => { onAdd({ name: x.name, icon: x.icon, photo: x.photo || '', sec: x.sec, est: x.est || 0 }); added++; status.textContent = t('libAdded', { name: x.name, n: added }); }, { 'aria-label': `${t('libAddTask')}: ${x.name}, ${dur(x.sec)}` })) : h('p', { class: 'empty' }, t('libNone')));
  }
  draw();
  return modal(`📚 ${t('libTaskTitle')}`, h('div', { class: 'stack' }, h('p', { class: 'note' }, t('libTaskHint')), search, chips, grid, status), [{ label: t('libDone'), primary: true }]);
}

/** Start a new routine from a template (mine or ready-made). */
export function openRoutinePicker(nav) {
  let tab = S.library().routines.length ? 'mine' : 'ideas', q = '';
  const search = h('input', { type: 'search', placeholder: t('libSearch'), 'aria-label': t('libSearch'), oninput: (e) => { q = e.target.value; draw(); } });
  const tabs = h('div', {}), grid = h('div', { class: 'tiles-grid' });
  let m;
  const make = async (entry) => { const tpl = await S.createFromEntry(entry); m.close(); nav(`#/edit/${tpl.id}`); };
  function draw() {
    setChildren(tabs, chipRow(t('libTabs'), [['mine', `⭐ ${t('libMyRoutines')}`], ['ideas', `💡 ${t('libIdeas')}`]], () => tab, (v) => { tab = v; draw(); }));
    const list = (tab === 'mine' ? S.library().routines : S.ideaRoutines()).filter((e) => !q || norm(e.name).includes(norm(q)));
    setChildren(grid, tile('➕', t('libEmpty'), t('libEmptyHint'), async () => { const x = S.newTemplate(t('untitled')); await S.saveTemplate(x); m.close(); nav(`#/edit/${x.id}`); }),
      list.map((e) => tile(e.icon, e.name, `${t('tasksCount', { n: e.tasks.length })} · ${dur(stepsSec(e))}`, () => make(e), { style: { '--accent': e.color }, 'aria-label': `${t('libUse')}: ${e.name}` })),
      tab === 'mine' && !S.library().routines.length ? h('p', { class: 'empty' }, t('libNoMine')) : null);
  }
  draw();
  m = modal(`📚 ${t('libRoutineTitle')}`, h('div', { class: 'stack' }, h('p', { class: 'note' }, t('libRoutineHint')), search, tabs, grid), [{ label: t('close') }]);
  return m;
}

export async function saveRoutineAsTemplate(tpl) { const ok = await S.saveToLibrary('routine', tpl); toast(ok ? t('libSaved', { name: tpl.name }) : t('libNothing')); }
export async function saveTaskAsTemplate(task) { const ok = await S.saveToLibrary('task', task); toast(ok ? t('libSaved', { name: task.name }) : t('libNothing')); }

function editEntry(kind, e) {
  const name = h('input', { type: 'text', maxLength: 80, value: e.name, 'aria-label': t('libName') });
  const ic = h('select', { 'aria-label': t('pickIcon') }, [e.icon, ...PICKER_ICONS.filter((x) => x !== e.icon)].filter(Boolean).map((x) => h('option', { value: x, selected: x === e.icon }, x)));
  let sec = e.sec, est = e.est;
  const times = kind === 'task' ? [timeField(t('duration'), e.sec, (v) => { sec = Math.max(1, v); }), timeField(t('estimate'), e.est, (v) => { est = v; }, { allowEmpty: true, emptyLabel: t('tpSame') })] : null;
  modal(`✏️ ${e.name}`, h('div', { class: 'stack' }, h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('libName')), name), h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('pickIcon')), ic), times),
    [{ label: t('cancel') }, { label: t('save'), primary: true, fn: async () => { if (!name.value.trim()) return false; await S.updateLibraryItem(kind, e.id, kind === 'task' ? { name: name.value, icon: ic.value, sec, est } : { name: name.value, icon: ic.value }); } }]);
}

async function del(kind, e) {
  if (!(await confirmBox(t('confirmDelete', { name: e.name }), t('delete'), true))) return;
  const undo = await S.removeLibraryItem(kind, e.id); toast(t('deletedUndo', { name: e.name }), { label: t('undo'), fn: undo });
}

export function renderLibrary(root, nav) {
  const draw = () => {
    const lib = S.library(), mine = S.get().templates;
    const routineCard = (e) => h('article', { class: 'card lib-card', style: { '--accent': e.color } }, h('div', { class: 'row' }, h('span', { class: 'emoji', 'aria-hidden': 'true' }, e.icon), h('span', { class: 'routine-text' }, h('strong', {}, e.name), h('small', {}, `${t('tasksCount', { n: e.tasks.length })} · ${dur(stepsSec(e))}`))),
      h('div', { class: 'row-btns' }, h('button', { class: 'btn small primary', type: 'button', onclick: async () => { const tpl = await S.createFromEntry(e); nav(`#/edit/${tpl.id}`); } }, `➕ ${t('libUse')}`),
        h('button', { class: 'btn small', type: 'button', onclick: () => openShare(S.templateFromEntry(e)) }, icon('share', 16), t('share')), h('button', { class: 'btn small', type: 'button', onclick: () => editEntry('routine', e) }, t('edit')), h('button', { class: 'btn small danger', type: 'button', onclick: () => del('routine', e) }, t('delete'))));
    const taskRow = (e) => h('div', { class: 'card lib-task row between' }, h('span', { class: 'row' }, h('span', { class: 'emoji', 'aria-hidden': 'true' }, e.photo ? '🖼️' : e.icon || suggestIcon(e.name)), h('span', { class: 'routine-text' }, h('strong', {}, e.name), h('small', {}, dur(e.sec)))),
      h('span', { class: 'row-btns' }, h('button', { class: 'btn small', type: 'button', onclick: () => openShare({ ...S.newTemplate(e.name), name: e.name, icon: e.icon || suggestIcon(e.name), tasks: [{ id: 'x', name: e.name, icon: e.icon, photo: '', sec: e.sec, est: e.est }] }) }, t('share')),
        h('button', { class: 'btn small', type: 'button', onclick: () => editEntry('task', e) }, t('edit')), h('button', { class: 'btn small danger', type: 'button', onclick: () => del('task', e) }, t('delete'))));
    setChildren(root, h('div', { class: 'row between' }, h('h1', {}, `📚 ${t('libTitle')}`), h('button', { class: 'btn', type: 'button', onclick: () => nav('#/') }, t('back'))), h('p', { class: 'note' }, t('libIntro')),
      h('div', { class: 'toolbar wrap' }, h('button', { class: 'btn primary', type: 'button', onclick: () => openRoutinePicker(nav) }, `📚 ${t('libFromTemplate')}`)),
      h('section', {}, h('h2', {}, t('libMyRoutines')),
        lib.routines.length ? h('div', { class: 'stack' }, lib.routines.map(routineCard)) : h('p', { class: 'empty' }, t('libNoMine')),
        mine.length ? h('div', { class: 'card stack' }, h('strong', {}, t('libSaveFrom')), h('div', { class: 'chips' }, mine.map((x) => h('button', { class: 'chip btn-chip', type: 'button', onclick: () => saveRoutineAsTemplate(x) }, `${x.icon} ${x.name}`)))) : null),
      h('section', {}, h('h2', {}, t('libMyTasks')), lib.tasks.length ? h('div', { class: 'stack' }, lib.tasks.map(taskRow)) : h('p', { class: 'empty' }, t('libNoTasks'))),
      h('p', { class: 'note' }, t('libBackupNote')));
  };
  draw(); const off = S.subscribe(draw);
  return () => off();
}
