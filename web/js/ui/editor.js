import { alarmEditor } from './alarmEditor.js';
import { h, fmtHuman, debounce, uid, setChildren } from '../util.js';
import { t, units } from '../i18n.js';
import * as S from '../store.js';
import { icon, iconBtn, toast, fold } from './common.js';
import { requestWebNotifications } from '../reminders.js';
import { native } from '../native.js';
import { suggestIcon, PICKER_ICONS } from '../taskIcons.js';
import { resizeToDataUrl } from '../photo.js';
import { suggestStart, validLeaveBy } from '../leave.js';
import { presetDays, normDays } from '../schedule.js';
import { getLang } from '../i18n.js';
import { modal } from './common.js';
import { timeField } from './timePicker.js';
import { openSmartTimes, openSmartSteps, timeHint, audiences, reasonText } from './smart.js';
import { suggestTime } from '../smart.js';
import { openGoalWizard } from './goals.js';
import { MAX_GOALS } from '../cogfun.js';
import { avatarNode } from './avatar.js';
import { AWARDS, AWARD_EMOJI, MAX_PTS, autoBase } from '../points.js';
import { openSpecialPicker, openTaskPicker, saveRoutineAsTemplate, saveTaskAsTemplate } from './library.js';

/** Task picture if it has a photo, else its emoji. */
export const iconNode = (task) => (task.photo ? h('img', { src: task.photo, alt: '' }) : (task.icon || suggestIcon(task.name)));

export function renderEditor(root, id, nav) {
  const orig = S.getTemplate(id);
  if (!orig) { nav('#/'); return () => {}; }
  let tpl = structuredClone(orig);
  const save = debounce(() => S.saveTemplate(tpl), 350);
  const change = (mutate, rerender = false) => { mutate(); save(); if (rerender) draw(); else updateTotal(); };
  const totalEl = h('strong', {});
  const updateTotal = () => { totalEl.textContent = `${t('total')}: ${fmtHuman(S.totalSec(tpl), units())}`; };
  const list = h('ol', { class: 'tasks', 'aria-label': t('tasks') });

  function taskRow(task, i) {
    const row = h('li', { class: 'task', dataset: { id: task.id } },
      h('button', { class: 'handle', type: 'button', 'aria-label': t('dragHandle'), title: t('dragHandle') }, icon('drag', 20)),
      h('div', { class: 'task-body' },
        h('div', { class: 'task-top' }, h('button', { class: 'task-icon', type: 'button', 'aria-label': `${t('taskIcon')}: ${task.icon || suggestIcon(task.name)}`, title: t('pickIcon'), onclick: (e) => pickIcon(task, e.currentTarget) }, iconNode(task)),
        h('input', { class: 'task-name', type: 'text', maxLength: 80, value: task.name, placeholder: t('taskName'), 'aria-label': t('taskName'), oninput: (e) => change(() => { task.name = e.target.value; if (!task.icon && !task.photo) row.querySelector('.task-icon').textContent = suggestIcon(task.name); }), onchange: () => { const slot = row.querySelector('.smart-slot'), key = `${task.name}|${task.sec}`; if (slot.dataset.key === key) return;   // a blur right after typing must not rebuild (and swallow) a hint that is being clicked
          slot.dataset.key = key; setChildren(slot, timeHint(task, (sec) => { change(() => { task.sec = sec; }, true); }) ?? ''); } })),
        task.helper ? h('small', { class: 'chip solid sp-chip' }, `✨ ${t('sptOpens', { tool: t(`helper_${task.helper}`) })}`) : null,
        h('div', { class: 'smart-slot' }, timeHint(task, (sec) => { change(() => { task.sec = sec; }, true); }) ?? ''),
        h('div', { class: 'task-times' }, timeField(t('duration'), task.sec, (v) => change(() => { task.sec = Math.max(1, v); }))),
        h('details', { class: 'task-more' }, h('summary', {}, t('taskMoreTime')),
          h('label', { class: 'switch-row' }, h('input', { type: 'checkbox', checked: !!task.feelAfter, onchange: (e) => change(() => { task.feelAfter = e.target.checked; }) }), h('span', {}, t('feelAfterTask'))),
          timeField(t('estimate'), task.est, (v) => change(() => { task.est = v; }), { allowEmpty: true, emptyLabel: t('tpSame') }),
          S.get().settings.scoring === 'off' ? null : h('div', { class: 'stack task-score' },
            S.get().settings.scoring === 'custom' ? h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('ptsTaskPoints')), h('input', { type: 'number', min: 0, max: MAX_PTS, inputMode: 'numeric', value: task.pts || '', placeholder: t('ptsAutoN', { n: autoBase(task.sec) }), 'aria-label': t('ptsTaskPoints'), oninput: (e) => change(() => { task.pts = Math.max(0, Math.min(MAX_PTS, Math.round(Number(e.target.value)) || 0)); }) }), h('small', { class: 'hint' }, t('ptsTaskHint'))) : null,
            h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('ptsAward')), h('select', { 'aria-label': t('ptsAward'), onchange: (e) => change(() => { task.award = e.target.value; }) }, h('option', { value: '' }, t('ptsNoAward')), AWARDS.map((a) => h('option', { value: a, selected: task.award === a }, `${AWARD_EMOJI[a]} ${t(`award_${a}`)}`))), h('small', { class: 'hint' }, t('ptsAwardHint')))))),
      h('button', { class: 'btn icon-btn task-menu-btn', type: 'button', 'aria-haspopup': 'dialog', 'aria-label': `${t('taskMenu')}: ${task.name || t('newTask')}`, title: t('taskMenu'), onclick: () => openTaskMenu(i) }, icon('menu', 22)));
    row.querySelector('.handle').addEventListener('pointerdown', (e) => startDrag(e, row));
    row.querySelector('.handle').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const to = i + (e.key === 'ArrowUp' ? -1 : 1); moveTask(i, to, true); }
    });
    return row;
  }
  /** The ☰ menu of a task: everything you can do with it, in one place. */
  function openTaskMenu(i) {
    const task = tpl.tasks[i]; let m;
    const item = (emoji, label, fn, { danger = false, disabled = false } = {}) => h('button', { class: `btn menu-item ${danger ? 'danger' : ''}`, type: 'button', disabled, onclick: () => { m.close(); fn(); } }, h('span', { 'aria-hidden': 'true' }, emoji), label);
    const last = tpl.tasks.length - 1;
    m = modal(`☰ ${task.name || t('newTask')}`, h('div', { class: 'stack task-menu' },
      item('➕', t('menuAddBelow'), () => { const nt = S.newTask(); nt.name = ''; change(() => tpl.tasks.splice(i + 1, 0, nt), true); list.children[i + 1]?.querySelector('.task-name')?.focus(); }),
      item('⧉', t('menuDuplicate'), () => change(() => tpl.tasks.splice(i + 1, 0, { ...structuredClone(task), id: uid() }), true)),
      item('⬆️', t('moveUp'), () => moveTask(i, i - 1), { disabled: i === 0 }), item('⬇️', t('moveDown'), () => moveTask(i, i + 1), { disabled: i === last }),
      item('⏫', t('menuToTop'), () => moveTask(i, 0), { disabled: i === 0 }), item('⏬', t('menuToBottom'), () => moveTask(i, last), { disabled: i === last }),
      item('✨', t('smSuggestTime'), () => { const sg = suggestTime({ name: task.name, runs: audiences()[0].runs, age: audiences()[0].age, areas: audiences()[0].areas, defaultSec: S.get().settings.defTaskSec }); change(() => { task.sec = sg.sec; }, true); toast(`${t('smApplied', { n: 1 })} ${reasonText(sg)}`); }),
      item('📚', t('libSaveTask'), () => saveTaskAsTemplate(task)),
      item('🖼️', t('pickIcon'), () => pickIcon(task, list.children[i]?.querySelector('.task-icon'))),
      item('🗑️', t('removeTask'), () => change(() => tpl.tasks.splice(i, 1), true), { danger: true })), [{ label: t('close') }]);
  }
  function pickIcon(task, btn) {
    const refresh = () => { setChildren(btn, iconNode(task)); save(); m.close(); };
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => {
      const f = e.target.files[0]; e.target.value = '';
      try { task.photo = await resizeToDataUrl(f); refresh(); } catch { toast(t('photoBad')); }
    } });
    const m = modal(t('pickIcon'), h('div', { class: 'stack' },
      h('div', { class: 'swatches' }, PICKER_ICONS.map((ic) => h('button', { type: 'button', class: 'emoji-pick', 'aria-label': ic, onclick: () => { task.icon = ic; task.photo = ''; refresh(); } }, ic))),
      h('div', { class: 'toolbar wrap' }, h('button', { class: 'btn', type: 'button', onclick: () => file.click() }, '📷 ', t('addPhoto')),
        task.photo ? h('button', { class: 'btn danger', type: 'button', onclick: () => { task.photo = ''; refresh(); } }, t('removePhoto')) : null), file),
      [{ label: t('cancel') }]);
  }
  function moveTask(from, to, refocus) {
    if (to < 0 || to >= tpl.tasks.length) return;
    tpl = S.reorderTasks(tpl, from, to); save(); draw();
    if (refocus) list.children[to]?.querySelector('.handle')?.focus();
  }

  // Pointer-based drag & drop: works with mouse, touch and pen; the row follows the pointer, siblings are re-evaluated on every move.
  function startDrag(e, row) {
    e.preventDefault();
    const handle = e.currentTarget; handle.setPointerCapture(e.pointerId);
    const rows = [...list.children], from = rows.indexOf(row);
    const startY = e.clientY, startTop = row.getBoundingClientRect().top;
    row.classList.add('dragging'); let to = from;
    const onMove = (ev) => {
      row.style.setProperty('transform', `translateY(${ev.clientY - startY}px)`);
      const mid = startTop + (ev.clientY - startY) + row.offsetHeight / 2;
      to = rows.filter((r) => r !== row).filter((r) => { const b = r.getBoundingClientRect(); return rows.indexOf(r) < from ? mid < b.top + b.height / 2 : mid > b.top + b.height / 2; })
        .reduce((acc, r) => (rows.indexOf(r) < from ? Math.min(acc, rows.indexOf(r)) : Math.max(acc, rows.indexOf(r))), from);
      rows.forEach((r, k) => { if (r === row) return; const shift = (from < to && k > from && k <= to) ? -row.offsetHeight : (from > to && k < from && k >= to) ? row.offsetHeight : 0; r.style.setProperty('transform', `translateY(${shift}px)`); });
    };
    const end = () => {
      handle.removeEventListener('pointermove', onMove); handle.removeEventListener('pointerup', end); handle.removeEventListener('pointercancel', end);
      if (to !== from) { tpl = S.reorderTasks(tpl, from, to); save(); }
      draw();
    };
    handle.addEventListener('pointermove', onMove); handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
  }

  const dayChips = (days, onChange) => h('fieldset', { class: 'days' }, h('legend', {}, t('alarmDays')),
    [0, 1, 2, 3, 4, 5, 6].map((d) => h('label', { class: 'day' }, h('input', { type: 'checkbox', checked: days.includes(d), onchange: (e) => { onChange(e.target.checked ? normDays([...days, d]) : days.filter((x) => x !== d)); } }), h('span', {}, t(`day${d}`)))));
  const scheduleBox = h('section', { class: 'card stack' }), gearBox = h('section', { class: 'card stack' }), whoBox = h('section', { class: 'card stack' });
  /** Who sees this routine: everyone (the default), or only the chosen people - one device, a parent or therapist setting up for the children. */
  const whoSummary = () => { const o = tpl.owners || []; return o.length ? S.profiles().filter((p) => o.includes(p.id)).map((p) => p.name || t('untitledProfile')).join(', ') : t('whoEveryone'); };
  function drawWho() {
    tpl.owners = tpl.owners || []; const all = !tpl.owners.length;
    const opt = (on, role, label, sub, fn, av) => h('button', { type: 'button', class: `wz-opt needs-opt ${on ? 'on' : ''}`, role, 'aria-checked': String(!!on), onclick: fn }, av || h('span', { class: 'wz-e', 'aria-hidden': 'true' }, '🌐'), h('span', {}, h('strong', {}, label), sub ? h('small', { class: 'hint' }, sub) : null));
    setChildren(whoBox, h('p', { class: 'note' }, t('whoHint')),
      h('div', { class: 'wz-list', role: 'radiogroup', 'aria-label': t('whoTitle') },
        opt(all, 'radio', t('whoEveryone'), t('whoEveryoneSub'), () => { tpl.owners = []; save(); drawWho(); updWho(); }),
        opt(!all, 'radio', t('whoSome'), t('whoSomeSub'), () => { if (all) { tpl.owners = [S.activeProfile().id]; save(); drawWho(); updWho(); } }, h('span', { class: 'wz-e', 'aria-hidden': 'true' }, '👥'))),
      all ? null : h('div', { class: 'wz-list', role: 'group', 'aria-label': t('whoSome') }, S.profiles().map((p) => opt(tpl.owners.includes(p.id), 'checkbox', p.name || t('untitledProfile'), '', () => {
        const has = tpl.owners.includes(p.id); const next = has ? tpl.owners.filter((x) => x !== p.id) : [...tpl.owners, p.id]; if (!next.length) { toast(t('whoNeedOne')); return; }
        tpl.owners = next; save(); drawWho(); updWho(); }, avatarNode(p.avatar, { size: 32 })))));
  }
  const updWho = () => { const sm = whoFold?.querySelector('.fold-s'); if (sm) sm.textContent = whoSummary(); };
  let whoFold = null;
  function drawSchedule() {
    const pre = presetDays(getLang()), set = (d) => { tpl.days = d; save(); drawSchedule(); };
    setChildren(scheduleBox, h('p', { class: 'note' }, t('scheduleHint')), dayChips(tpl.days || [], set),
      h('div', { class: 'row-btns' }, h('button', { class: 'btn small', type: 'button', onclick: () => set([]) }, t('presetEvery')), h('button', { class: 'btn small', type: 'button', onclick: () => set(pre.school) }, t('presetSchool')), h('button', { class: 'btn small', type: 'button', onclick: () => set(pre.weekend) }, t('presetWeekend'))));
  }
  function drawGear() {
    tpl.gear ||= [];
    setChildren(gearBox, h('p', { class: 'note' }, t('gearHint')), tpl.gear.map((g, i) => h('div', { class: 'gear-row' },
      h('div', { class: 'row' }, h('span', { class: 'ti-s', 'aria-hidden': 'true' }, g.icon || suggestIcon(g.name)), h('input', { type: 'text', maxLength: 40, value: g.name, placeholder: t('gearName'), 'aria-label': t('gearName'), oninput: (e) => { g.name = e.target.value; save(); } }),
        iconBtn('trash', t('gearRemove'), () => { tpl.gear.splice(i, 1); save(); drawGear(); })), dayChips(g.days || [], (d) => { g.days = d; save(); drawGear(); }))),
      h('button', { class: 'btn add', type: 'button', onclick: () => { tpl.gear.push({ id: uid(), name: '', icon: '', days: [] }); save(); drawGear(); gearBox.querySelector('.gear-row:last-of-type input[type=text]')?.focus(); } }, icon('plus', 18), t('addGear')));
  }
  const goalBox = h('section', { class: 'card stack' });
  /** Goals linked to this routine (cogfun goals have a templateId): link / unlink / create one right here. */
  function drawGoals() {
    const linked = S.goals().filter((g) => g.templateId === tpl.id), free = S.goals().filter((g) => g.templateId !== tpl.id && !g.done);
    const sel = h('select', { 'aria-label': t('edGoalLink'), onchange: async (e) => { const g = S.goals().find((x) => x.id === e.target.value); if (g) { await S.saveGoal({ ...g, templateId: tpl.id }); drawGoals(); } } }, h('option', { value: '' }, t('edGoalLink')), free.map((g) => h('option', { value: g.id }, g.title)));
    setChildren(goalBox, h('p', { class: 'note' }, t('edGoalHint')), linked.length ? linked.map((g) => h('div', { class: 'row between' }, h('span', {}, `🎯 ${g.title}`), h('button', { class: 'btn small', type: 'button', onclick: async () => { await S.saveGoal({ ...g, templateId: '' }); drawGoals(); } }, t('edGoalUnlink')))) : h('p', { class: 'empty' }, t('edGoalNone')),
      free.length ? sel : null, S.goals().length < MAX_GOALS ? h('button', { class: 'btn', type: 'button', onclick: () => openGoalWizard({ title: '', templateId: tpl.id, strategies: [], custom: '' }, { onSave: async (x) => { await S.saveGoal({ ...x, templateId: tpl.id }); drawGoals(); } }) }, `+ ${t('edGoalNew')}`) : null);
  }
  const plansBox = h('section', { class: 'card stack' });
  function drawPlans() {
    tpl.plans ||= [];
    setChildren(plansBox, h('p', { class: 'note' }, t('plansHint')), tpl.plans.map((p, i) => h('div', { class: 'plan-row' },
      h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('planWhen')), h('input', { type: 'text', maxLength: 80, value: p.when, placeholder: t('planWhenPh'), oninput: (e) => { p.when = e.target.value; save(); } })),
      h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('planThen')), h('input', { type: 'text', maxLength: 80, value: p.then, placeholder: t('planThenPh'), oninput: (e) => { p.then = e.target.value; save(); } })),
      iconBtn('trash', t('delete'), () => { tpl.plans.splice(i, 1); save(); drawPlans(); }))),
      tpl.plans.length < 5 ? h('button', { class: 'btn add', type: 'button', onclick: () => { tpl.plans.push({ id: uid(), when: '', then: '' }); save(); drawPlans(); plansBox.querySelector('.plan-row:last-of-type input')?.focus(); } }, icon('plus', 18), t('planAdd')) : null);
  }
  const alarmEd = alarmEditor(tpl, save), alarmBox = alarmEd.el, drawAlarm = alarmEd.draw;

  function draw() {
    list.replaceChildren(...tpl.tasks.map(taskRow));
    updateTotal();
  }
  const colors = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': t('routineColor') }, S.COLORS.map((c) =>
    h('button', { type: 'button', class: `swatch ${tpl.color === c ? 'on' : ''}`, style: { '--c': c }, role: 'radio', 'aria-checked': String(tpl.color === c), 'aria-label': c,
      onclick: (e) => { tpl.color = c; save(); colors.querySelectorAll('.swatch').forEach((b) => { b.classList.toggle('on', b === e.currentTarget); b.setAttribute('aria-checked', String(b === e.currentTarget)); }); } })));
  const icons = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': t('routineIcon') }, S.ICONS.map((ic) =>
    h('button', { type: 'button', class: `emoji-pick ${tpl.icon === ic ? 'on' : ''}`, role: 'radio', 'aria-checked': String(tpl.icon === ic),
      onclick: (e) => { tpl.icon = ic; save(); icons.querySelectorAll('.emoji-pick').forEach((b) => { b.classList.toggle('on', b === e.currentTarget); b.setAttribute('aria-checked', String(b === e.currentTarget)); }); } }, ic)));

  const dayNames = (d) => (d && d.length ? d.map((x) => t(`day${x}`)).join(' ') : t('presetEvery'));
  const foldSched = dayNames(tpl.days), foldGear = tpl.gear?.length ? String(tpl.gear.length) : t('foldNone'), foldPlans = tpl.plans?.length ? String(tpl.plans.length) : t('foldNone');
  const foldGoal = (() => { const n = S.goals().filter((g) => g.templateId === tpl.id).length; return n ? String(n) : t('foldNone'); })();
  const foldLeave = tpl.leaveBy || t('foldNone'), foldAlarm = tpl.alarm?.enabled ? `⏰ ${tpl.alarm.time || ''}` : t('foldOff');
  setChildren(root, 
    h('div', { class: 'page-head' }, iconBtn('back', t('back'), () => { save.flush(); nav('#/'); }), h('h1', {}, t('edit'))),
    h('label', { class: 'field' }, h('span', { class: 'lbl' }, t('routineName')),
      h('input', { type: 'text', maxLength: 80, value: tpl.name, oninput: (e) => { tpl.name = e.target.value; save(); } })),
    h('div', { class: 'field' }, h('span', { class: 'lbl' }, t('routineIcon')), icons),
    h('div', { class: 'field' }, h('span', { class: 'lbl' }, t('routineColor')), colors),
    h('div', { class: 'row between' }, h('h2', {}, t('tasks')), totalEl),
    list,
    h('button', { class: 'btn add', type: 'button', onclick: () => { const nt = S.newTask(); nt.name = ''; change(() => tpl.tasks.push(nt), true); list.lastElementChild?.querySelector('.task-name')?.focus(); } }, icon('plus', 18), t('addTask')),
    h('div', { class: 'toolbar wrap' }, h('button', { class: 'btn', type: 'button', onclick: () => openTaskPicker((task) => { const nt = { ...S.newTask(), ...task, id: uid() }; change(() => tpl.tasks.push(nt), true); }) }, `📚 ${t('libAddFrom')}`),
      h('button', { class: 'btn', type: 'button', onclick: () => openSpecialPicker((task) => { const nt = { ...S.newTask(), ...task, id: uid() }; change(() => tpl.tasks.push(nt), true); }) }, `✨ ${t('sptBtn')}`),
      h('button', { class: 'btn', type: 'button', onclick: () => openSmartTimes(tpl, (m) => change(() => { for (const [i, sec] of m) if (tpl.tasks[i]) tpl.tasks[i].sec = sec; }, true)) }, `✨ ${t('smTimesBtn')}`)),
    fold(t('moreTools'), t('moreToolsSub'), h('div', { class: 'stack' },
      h('button', { class: 'btn', type: 'button', onclick: () => openSmartSteps(tpl, (tasks) => change(() => { tpl.tasks = tasks; }, true)) }, `🧩 ${t('smStepsBtn')}`),
      h('button', { class: 'btn', type: 'button', onclick: () => { save.flush(); saveRoutineAsTemplate(tpl); } }, `💾 ${t('libSaveRoutine')}`),
      h('p', { class: 'note' }, t('dragHint')), h('p', { class: 'note' }, t('estimateHint')))).el,
    S.profiles().length > 1 ? (whoFold = fold(`👥 ${t('whoTitle')}`, whoSummary(), whoBox).el) : null,
    fold(t('schedule'), foldSched, scheduleBox).el,
    fold(t('gear'), foldGear, gearBox).el,
    fold(t('edGoal'), foldGoal, goalBox).el,
    fold(t('plansTitle'), foldPlans, plansBox).el,
    fold(t('leaveBy'), foldLeave, h('div', { class: 'stack' }, h('p', { class: 'note' }, t('leaveHint')),
      h('div', { class: 'row' }, h('input', { type: 'time', value: tpl.leaveBy || '', 'aria-label': t('leaveBy'), oninput: (e) => { tpl.leaveBy = validLeaveBy(e.target.value); save(); } }),
        h('button', { class: 'btn', type: 'button', onclick: () => {
          const at = suggestStart(tpl.leaveBy, S.totalSec(tpl)); if (!at) return;
          tpl.alarm.time = at; save(); drawAlarm(); toast(t('startBy', { time: at }));
        } }, t('suggestStart'))))).el,
    fold(t('feelAtTitle'), t(`feelAt_${tpl.feelAt || 'none'}`), h('div', { class: 'stack' }, h('p', { class: 'note' }, t('feelAtHint')),
      h('select', { 'aria-label': t('feelAtTitle'), onchange: (e) => { tpl.feelAt = e.target.value; save(); } }, ['none', 'start', 'end', 'both'].map((v) => h('option', { value: v, selected: (tpl.feelAt || 'none') === v }, t(`feelAt_${v}`)))))).el,
    fold(t('alarm'), foldAlarm, alarmBox).el,
    h('div', { class: 'sticky-actions' },
      h('button', { class: 'btn', type: 'button', onclick: () => { save.flush(); nav('#/'); } }, t('save')),
      h('button', { class: 'btn primary', type: 'button', disabled: !tpl.tasks.length, onclick: () => { save.flush(); nav(`#/run/${tpl.id}`); } }, icon('play', 18), t('start'))));
  draw(); drawWho(); drawAlarm(); drawSchedule(); drawGear(); drawPlans(); drawGoals();
  return () => save.flush();
}
