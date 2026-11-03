import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAvatar, defaultAvatar, avatarEmoji, shareableAvatar, avatarFromMascot, characterShapes, CHARACTERS, isSafeGif, AVATAR_COLORS } from '../../web/js/avatar.js';
import { levelInfo, LEVEL_STARS } from '../../web/js/levels.js';
import { normalizeProfile, runsOf, publicProfile, newProfile } from '../../web/js/profiles.js';
import * as S from '../../web/js/store.js';

const GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
test('sanitizeAvatar accepts valid kinds and rejects everything hostile', () => {
  assert.deepEqual(sanitizeAvatar({ k: 'char', id: 'cat', color: '#112233' }), { k: 'char', id: 'cat', color: '#112233' });
  assert.deepEqual(sanitizeAvatar({ k: 'char', id: 'cat', color: 'red' }), { k: 'char', id: 'cat', color: CHARACTERS.cat.base });
  assert.deepEqual(sanitizeAvatar({ k: 'emoji', e: '🦊<img onerror=1>' }).e, '🦊img onerror=1'.slice(0, 8), 'markup characters stripped and length capped');
  assert.equal(sanitizeAvatar({ k: 'gif', url: GIF }).k, 'gif');
  for (const bad of [null, 5, 'x', { k: 'char', id: '__proto__' }, { k: 'photo', url: 'javascript:alert(1)' }, { k: 'photo', url: 'data:image/svg+xml;base64,AAAA' }, { k: 'gif', url: 'data:image/gif;base64,AAAA' }, { k: 'gif', url: GIF + 'A'.repeat(300_000) }, { k: 'emoji', e: '' }, { k: 'weird' }])
    assert.deepEqual(sanitizeAvatar(bad), defaultAvatar(), JSON.stringify(bad).slice(0, 50));
  assert.ok(isSafeGif(GIF)); assert.ok(!isSafeGif('data:image/gif;base64,AAAAAAAA'));
});
test('avatarEmoji / shareableAvatar / avatarFromMascot: photos and GIFs never leave the device', () => {
  assert.equal(avatarEmoji({ k: 'char', id: 'panda' }), '🐼'); assert.equal(avatarEmoji({ k: 'emoji', e: '🚀' }), '🚀'); assert.equal(avatarEmoji({ k: 'gif', url: GIF }), '🙂');
  assert.deepEqual(shareableAvatar({ k: 'gif', url: GIF }), { k: 'emoji', e: '🙂' }); assert.equal(shareableAvatar({ k: 'char', id: 'fox' }).k, 'char');
  assert.equal(avatarFromMascot('🐼').id, 'panda'); assert.deepEqual(avatarFromMascot('🐯'), { k: 'emoji', e: '🐯' }); assert.equal(avatarFromMascot(null).k, 'emoji');
});
test('every character draws: shapes exist, eyes group is animatable, fixed colours ignore the picker, others follow it', () => {
  for (const id of Object.keys(CHARACTERS)) {
    const sh = characterShapes(id, AVATAR_COLORS[3]);
    assert.ok(sh.body.length >= 5 && sh.body.some((x) => x.cls === 'av-eyes') && sh.body.some((x) => x.cls === 'av-mouth') && sh.hand.cls === 'av-hand', id);
    const head = sh.body.find((x) => (x.tag === 'circle' || x.tag === 'rect') && x.a.fill && (x.a.r === 36 || x.a.width === 72));
    assert.equal(head.a.fill, CHARACTERS[id].fixed ? CHARACTERS[id].base : AVATAR_COLORS[3], id);
  }
  assert.ok(Object.values(CHARACTERS).every((c) => c.unlock >= 1)); assert.ok(Object.values(CHARACTERS).filter((c) => c.unlock === 1).length >= 3, 'some characters are free from the start');
});
test('levels: monotonic thresholds, level/next/pct', () => {
  assert.ok(LEVEL_STARS.every((v, i) => i === 0 || v > LEVEL_STARS[i - 1]));
  assert.deepEqual([levelInfo(0).level, levelInfo(5).level, levelInfo(6).level, levelInfo(29).level, levelInfo(30).level], [1, 1, 2, 3, 4]);
  assert.equal(levelInfo(3).pct, 0.5); assert.equal(levelInfo(3).toNext, 3); assert.equal(levelInfo(99999).next, null); assert.equal(levelInfo(99999).pct, 1); assert.equal(levelInfo(-4).level, 1); assert.equal(levelInfo('x').level, 1);
});
test('profiles: normalisation, legacy runs belong to the first profile, public view hides photos', () => {
  const p = normalizeProfile({ id: 'a'.repeat(100), name: 'x'.repeat(99), age: 2, gender: 'zzz', avatar: { k: 'gif', url: GIF }, seenBadges: ['ok', 5, 'y'.repeat(99)] });
  assert.equal(p.id.length, 64); assert.equal(p.name.length, 30); assert.equal(p.age, null); assert.equal(p.gender, 'other'); assert.equal(p.seenBadges.length, 2);
  const runs = [{ id: 1 }, { id: 2, profileId: 'b' }, { id: 3, profileId: 'a' }];
  assert.deepEqual(runsOf(runs, 'a', 'a').map((r) => r.id), [1, 3]); assert.deepEqual(runsOf(runs, 'b', 'a').map((r) => r.id), [2]);
  assert.equal(publicProfile(p).avatar.k, 'emoji'); assert.equal(newProfile({ name: 'N' }).name, 'N');
});
test('store: first profile is created from the old settings; name/avatar edits go to the ACTIVE profile; switching, runs per person, delete, backup merge', async () => {
  await S.init(); assert.equal(S.profiles().length, 1); const first = S.profiles()[0];
  await S.updateSettings({ personName: 'Noa', age: 8, gender: 'female', avatar: { k: 'char', id: 'cat', color: '#ef4444' } });
  assert.equal(S.activeProfile().name, 'Noa'); assert.equal(S.activeProfile().avatar.id, 'cat'); assert.equal(S.get().settings.mascot, '🐱');
  const dan = await S.saveProfile({ name: 'Dan', age: 11, gender: 'male', avatar: { k: 'emoji', e: '🚀' } }); assert.equal(S.profiles().length, 2); assert.equal(S.activeProfile().id, first.id, 'adding does not switch');
  await S.saveRun({ id: 'r1', profileId: first.id, templateId: 't', templateName: 'x', startedAt: 1, endedAt: 2, status: 'done', plannedTotal: 1, estTotal: 1, actualTotal: 1, tasks: [] });
  await S.saveRun({ id: 'r0', templateId: 't', templateName: 'x', startedAt: 1, endedAt: 2, status: 'done', plannedTotal: 1, estTotal: 1, actualTotal: 1, tasks: [] });
  await S.saveRun({ id: 'r2', profileId: dan.id, templateId: 't', templateName: 'x', startedAt: 1, endedAt: 2, status: 'done', plannedTotal: 1, estTotal: 1, actualTotal: 1, tasks: [] });
  assert.deepEqual(S.myRuns().map((r) => r.id).sort(), ['r0', 'r1']); await S.switchProfile(dan.id);
  assert.equal(S.get().settings.personName, 'Dan'); assert.equal(S.get().settings.avatar.e, '🚀'); assert.deepEqual(S.myRuns().map((r) => r.id), ['r2']);
  await S.updateSettings({ personName: 'Daniel' }); assert.equal(S.profiles().find((p) => p.id === dan.id).name, 'Daniel'); assert.equal(S.profiles().find((p) => p.id === first.id).name, 'Noa');
  const backup = JSON.parse(S.exportAll()); assert.equal(backup.profiles.length, 2);
  await S.importBackup(JSON.stringify({ app: 'morning-organizer', v: 1, templates: [], runs: [], profiles: [{ id: 'sib', name: 'Sibling', avatar: { k: 'char', id: 'frog' } }, { id: dan.id, name: 'HACK', seenBadges: ['b1'] }, null, 'x'] }), { settings: false });
  assert.equal(S.profiles().length, 3); assert.equal(S.profiles().find((p) => p.id === 'sib').avatar.id, 'frog');
  assert.equal(await S.deleteProfile(dan.id), true); assert.deepEqual(S.runsForProfile(dan.id), []); assert.notEqual(S.activeProfile().id, dan.id);
  await S.deleteProfile('sib'); assert.equal(await S.deleteProfile(S.profiles()[0].id), false, 'the last profile cannot be deleted');
});

test('prototype-key lookups are safe for untrusted values (voice preset, avatar id)', async () => {
  await S.init(); await S.updateSettings({ voicePreset: '__proto__' }); assert.notEqual(S.get().settings.voicePreset, '__proto__');
  await S.updateSettings({ voicePreset: 'robot' }); assert.equal(S.get().settings.voicePreset, 'robot'); await S.updateSettings({ voicePreset: 'constructor' }); assert.equal(S.get().settings.voicePreset, 'robot');
});
