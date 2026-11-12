import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { SKINS } from '../../web/js/skins.js';

const RES = new URL('../../android/app/src/main/res/', import.meta.url);
test('every look has a widget card in each size, light and dark, and the Android side knows the same looks', () => {
  for (const skin of SKINS) for (const size of ['2x2', '4x1', '4x2']) for (const dir of ['drawable-nodpi', 'drawable-night-nodpi']) {
    const f = new URL(`${dir}/wbgk_${size}_${skin}.png`, RES); assert.ok(existsSync(f), `${dir}/wbgk_${size}_${skin}.png`); assert.ok(statSync(f).size > 1000);
  }
  const kt = readFileSync(new URL('../../android/app/src/main/java/com/morningorganizer/app/WidgetLook.kt', import.meta.url), 'utf8');
  const set = /SKINS = setOf\(([^)]*)\)/.exec(kt)[1].split(',').map((x) => x.trim().replace(/"/g, ''));
  assert.deepEqual(set.sort(), [...SKINS].sort());
});
test('every widget layout has the background image the look is applied to, and every provider applies it', () => {
  const layouts = ['calm', 'calm_sunny', 'card', 'journal', 'mood', 'points', 'routines', 'run', 'sentence', 'stats'];
  for (const l of layouts) assert.match(readFileSync(new URL(`layout/widget_${l}.xml`, RES), 'utf8'), /@\+id\/widget_bg_img/, l);
  for (const k of ['Calm', 'CalmSunny', 'Journal', 'Mood', 'Points', 'RoutineCard', 'Routine', 'Run', 'Sentence', 'Stats']) assert.match(readFileSync(new URL(`../java/com/morningorganizer/app/${k}Widget.kt`, RES), 'utf8'), /WidgetLook\.apply/, k);
});
