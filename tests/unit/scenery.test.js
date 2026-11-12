import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseScenery, skyAt, frameFor, MEDAL_OF, screenArtFor, suggestSil, isSil, SILS, SKIES } from '../../web/js/scenery.js';

test('the shipped scenery kit parses with 14 frames, 6 skies and the dividers', () => {
  const s = parseScenery(JSON.parse(readFileSync(new URL('../../web/data/scenery.json', import.meta.url), 'utf8')));
  assert.equal(Object.keys(s.frames).length, 14); assert.equal(Object.keys(s.skies).length, 6); assert.ok(s.dividers.sunrise);
  for (const k of SKIES) assert.ok(s.skies[k], k);
});
test('unsafe or foreign data is refused', () => {
  assert.equal(parseScenery(null), null); assert.equal(parseScenery({ format: 'x', version: 1 }), null);
  assert.equal(parseScenery({ format: 'sonrise-scenery', version: 1, frames: { 1: '<svg viewBox="0 0 1 1"><script/></svg>' } }), null);
});
test('sky by hour and frame by level', () => {
  assert.equal(skyAt(6), 'dawn'); assert.equal(skyAt(9), 'morning'); assert.equal(skyAt(12), 'noon'); assert.equal(skyAt(16), 'afternoon'); assert.equal(skyAt(19), 'dusk'); assert.equal(skyAt(23), 'night'); assert.equal(skyAt(3), 'night');
  assert.equal(frameFor(0), 1); assert.equal(frameFor(5), 5); assert.equal(frameFor(99), 14); assert.equal(frameFor('x'), 1);
});
test('the 14 screen backgrounds ship, and each screen has its own picture (none behind the run screen)', () => {
  const s = parseScenery(JSON.parse(readFileSync(new URL('../../web/data/scenery.json', import.meta.url), 'utf8')));
  assert.equal(Object.keys(s.screens).length, 14);
  for (const v of ['home', 'calm', 'feel', 'nlp', 'stats', 'settings', 'journal']) assert.ok(s.screens[screenArtFor(v)], v);
  assert.equal(screenArtFor('run'), null); assert.equal(screenArtFor('constructor'), null); assert.equal(screenArtFor('home', true), 'play');
});
test('the 14 task silhouettes ship and are suggested from a task name (Hebrew and English)', () => {
  const s = parseScenery(JSON.parse(readFileSync(new URL('../../web/data/scenery.json', import.meta.url), 'utf8')));
  assert.deepEqual(Object.keys(s.tasks).sort(), Object.keys(SILS).sort());
  assert.equal(suggestSil('Brush your teeth'), 'brush-teeth'); assert.equal(suggestSil('לצחצח שיניים'), 'brush-teeth'); assert.equal(suggestSil('Pack the bag'), 'pack-bag'); assert.equal(suggestSil('לאכול ארוחת בוקר'), 'breakfast'); assert.equal(suggestSil('Meditate'), '');
  assert.ok(isSil('shower')); assert.equal(isSil('../x'), false); assert.equal(isSil(undefined), false);
});
test('the medals: 14 levels and the streaks, each with a locked form', () => {
  const s = parseScenery(JSON.parse(readFileSync(new URL('../../web/data/scenery.json', import.meta.url), 'utf8')));
  for (let i = 1; i <= 14; i++) { assert.ok(s.badges[`level-${i}`], `level-${i}`); assert.ok(s.badges[`level-${i}-locked`], `level-${i}-locked`); }
  for (const id of Object.values(MEDAL_OF)) { assert.ok(s.badges[id], id); assert.ok(s.badges[`${id}-locked`], `${id}-locked`); }
});
test('the four new achievements have medals (and their locked form), and are earned from check-ins, look-backs and a backup', async () => {
  const { earnedBadges, BADGES } = await import('../../web/js/badges.js');
  const s = parseScenery(JSON.parse(readFileSync(new URL('../../web/data/scenery.json', import.meta.url), 'utf8')));
  for (const id of ['streak14', 'firstcalm', 'firstfeel', 'firstlook', 'firstbackup']) { assert.ok(BADGES.some((b) => b.id === id), id); assert.ok(s.badges[MEDAL_OF[id]] && s.badges[`${MEDAL_OF[id]}-locked`], id); }
  assert.deepEqual(earnedBadges([], {}), []); assert.deepEqual(earnedBadges([], { calm: 3 }), ['firstcalm']); assert.deepEqual(earnedBadges([], { feel: 1, retro: 2, backup: true }).sort(), ['firstbackup', 'firstfeel', 'firstlook']);
});
test('the loading sunrise loops: the sun rises and sinks and the rays open in turn', async () => {
  const { frameAt, LOOP_MS } = await import('../../web/js/loadingSunny.js');
  assert.equal(LOOP_MS, 2400); assert.equal(frameAt(0).dy, 0); assert.equal(frameAt(0.5).dy, -19); assert.equal(frameAt(0.5).opacity, 1); assert.ok(Math.abs(frameAt(1).dy) < 1e-9, 'the end matches the start (no jump)');
  assert.ok(frameAt(0.25).dy < 0 && frameAt(0.75).dy < 0 && frameAt(0.75).dy > frameAt(0.5).dy);
  assert.notEqual(frameAt(0.3, 0).opacity, frameAt(0.3, 8).opacity, 'later rays open a little after the first');
  const m = JSON.parse((await import('node:fs')).readFileSync(new URL('../../web/data/mascot.json', import.meta.url), 'utf8'));
  assert.ok(m.moods['anim-loading'].svg.includes('viewBox="0 0 160 160"') && !m.moods['anim-loading'].svg.includes('ns0:'));
});
test('the silhouette of a task travels with it into the difficulty and trend lists, so the statistics can draw it', async () => {
  const D = await import('../../web/js/difficulty.js');
  const run = (i) => ({ id: `r${i}`, status: 'done', endedAt: 1e12 + i * 1e6, startedAt: 1e12 + i * 1e6 - 1e5, templateId: 't', templateName: 'T', plannedTotal: 100, actualTotal: 90, tasks: [{ id: 'a', name: 'Brush teeth', icon: '🪥', sil: 'brush-teeth', done: true, plannedSec: 60, actualSec: 70, difficulty: 4 + (i % 2), help: {} }, { id: 'b', name: 'Read', icon: '📚', done: true, plannedSec: 60, actualSec: 50, difficulty: 2, help: {} }] });
  const runs = [1, 2, 3].map(run), stats = D.taskDifficulty(runs), trends = D.difficultyTrends(runs);
  assert.equal(stats.find((x) => x.name === 'Brush teeth').sil, 'brush-teeth'); assert.equal(stats.find((x) => x.name === 'Read').sil, '');
  assert.equal(trends.find((x) => x.name === 'Brush teeth').sil, 'brush-teeth');
});
