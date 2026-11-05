import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeView, isFull, visibleSet, shows, areasFor, labelKeys, FEATURES, CORE } from '../../web/js/needs.js';
import { normalizeProfile } from '../../web/js/profiles.js';

test('needs: the default shows everything; a model or a difficulty shows only what fits; core is never hidden', () => {
  assert.equal(isFull({}), true); assert.equal(visibleSet({}), null); assert.ok(FEATURES.every((f) => shows({}, f)));
  const cbt = { model: 'cbt', problems: [] };
  assert.ok(shows(cbt, 'aprt') && shows(cbt, 'journal') && shows(cbt, 'calm')); assert.ok(!shows(cbt, 'rewards') && !shows(cbt, 'reports') && !shows(cbt, 'family')); assert.ok(CORE.every((c) => shows(cbt, c)));
  const cog = { model: 'cogfun', problems: [] }; assert.ok(shows(cog, 'goals') && shows(cog, 'retros') && shows(cog, 'smart')); assert.ok(!shows(cog, 'journal') && !shows(cog, 'aprt'));
  const adhd = { model: 'full', problems: ['adhd'] }; assert.ok(shows(adhd, 'rewards') && shows(adhd, 'calm')); assert.ok(!shows(adhd, 'journal'));
  const both = { model: 'cbt', problems: ['adhd'] }; assert.ok(shows(both, 'journal') && shows(both, 'rewards'), 'choices add up');
});
test('needs: untrusted values are cleaned; help areas follow the choice; labels', () => {
  assert.deepEqual(sanitizeView({ model: 'bogus', problems: ['adhd', 'x', 'adhd', '__proto__', 5] }), { model: 'full', problems: ['adhd'] }); assert.deepEqual(sanitizeView('x'), { model: 'full', problems: [] });
  assert.deepEqual(areasFor({}), []); assert.deepEqual(areasFor({ model: 'full', problems: ['anxiety'] }), ['calm']); assert.deepEqual(areasFor({ model: 'cbt', problems: ['adhd'] }).sort(), ['calm', 'focus', 'time']);
  assert.deepEqual(labelKeys({}), ['need_full']); assert.deepEqual(labelKeys({ model: 'cogfun', problems: ['anxiety'] }), ['need_cogfun', 'need_anxiety']);
});
test('a profile keeps its needs and its own settings (sanitised)', () => {
  const p = normalizeProfile({ name: 'Dana', view: { model: 'cbt', problems: ['anxiety', 'zzz'] }, prefs: { theme: 'dark', fontScale: 150, skin: 'ocean', evil: 1, __proto__: { x: 1 }, voiceRate: 9999 } });
  assert.deepEqual(p.view, { model: 'cbt', problems: ['anxiety'] }); assert.equal(p.prefs.theme, 'dark'); assert.equal(p.prefs.fontScale, 150); assert.equal(p.prefs.skin, 'ocean'); assert.ok(!('evil' in p.prefs)); assert.ok(!('voiceRate' in p.prefs), 'out-of-range values are dropped');
  assert.deepEqual(normalizeProfile({ name: 'x' }).view, { model: 'full', problems: [] }); assert.equal(normalizeProfile({ name: 'x' }).prefs, null);
});
