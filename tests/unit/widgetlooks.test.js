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
  const layouts = ['calm', 'calm_sunny', 'card', 'journal', 'mood', 'points', 'routines', 'run', 'sentence', 'stats', 'bell', 'balance'];
  for (const l of layouts) assert.match(readFileSync(new URL(`layout/widget_${l}.xml`, RES), 'utf8'), /@\+id\/widget_bg_img/, l);
  for (const k of ['Calm', 'CalmSunny', 'Journal', 'Mood', 'Points', 'RoutineCard', 'Routine', 'Run', 'Sentence', 'Stats', 'Bell', 'Balance']) assert.match(readFileSync(new URL(`../java/com/morningorganizer/app/${k}Widget.kt`, RES), 'utf8'), /WidgetLook\.apply/, k);
});
test('the bell and balance widgets are registered, have their pictures and words in both languages, and the stats push carries the balance', () => {
  const man = readFileSync(new URL('AndroidManifest.xml', new URL('../../android/app/src/main/', import.meta.url)), 'utf8');
  for (const k of ['BellWidget', 'BalanceWidget']) assert.ok(man.includes(`android:name=".${k}"`), k);
  for (const f of ['wi_bell_0', 'wi_bell_1', 'wi_bell_2', 'wi_bell_off', 'wi_balance_0', 'wi_balance_1', 'wi_balance_2', 'wi_balance_3', 'wi_balance_4']) assert.ok(existsSync(new URL(`drawable-nodpi/${f}.png`, RES)), f);
  for (const dir of ['values', 'values-he']) { const x = readFileSync(new URL(`${dir}/strings.xml`, RES), 'utf8'); for (const k of ['widget_bell_label', 'widget_bell_desc', 'bell_paused', 'bell_none', 'bell_tomorrow', 'widget_balance_label', 'widget_balance_desc', 'balance_text']) assert.ok(x.includes(`name="${k}"`), `${dir} ${k}`); }
  assert.match(readFileSync(new URL('../../web/js/app.js', import.meta.url), 'utf8'), /bal: balanceStep/);
});
