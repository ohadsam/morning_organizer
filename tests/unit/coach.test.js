import test from 'node:test';
import assert from 'node:assert/strict';
import { TIPS, CATEGORIES } from '../../web/js/coachTips.js';
import { pickTip, coachTrigger, newMemo, audience } from '../../web/js/coach.js';
import { gendered, personalize, POOLS, KID_EXTRA } from '../../web/js/feedback.js';
import { PRESETS } from '../../web/js/speech.js';
import * as E from '../../web/js/engine.js';

const GENDERS = ['male', 'female', 'other'], TIERS = ['kid', 'teen', 'adult'];
test('tip library: unique ids, known categories/situations, every tier x language present, sensible length', () => {
  assert.ok(TIPS.length >= 60); assert.equal(new Set(TIPS.map((x) => x.id)).size, TIPS.length);
  for (const tip of TIPS) {
    assert.ok(CATEGORIES[tip.cat], tip.id); assert.ok(['any', 'late', 'stuck'].includes(tip.sit), tip.id);
    for (const tier of TIERS) { assert.equal(tip.text[tier]?.length, 2, `${tip.id}/${tier}`); for (const txt of tip.text[tier]) assert.ok(txt.length > 25 && txt.length < 260, `${tip.id}/${tier}: ${txt.length}`); }
  }
  for (const cat of Object.keys(CATEGORIES)) assert.ok(TIPS.some((x) => x.cat === cat), cat);
  for (const sit of ['late', 'stuck']) assert.ok(TIPS.filter((x) => x.sit === sit).length >= 8, sit);
});
test('every tip renders cleanly for every gender, tier, language and with/without a name', () => {
  for (const tip of TIPS) for (const tier of TIERS) for (const [li, l] of ['en', 'he'].entries()) for (const g of GENDERS) for (const name of ['', 'Noa']) {
    const out = personalize(tip.text[tier][li], { gender: g, name }); assert.ok(!/[{}|]/.test(out), `${tip.id}/${tier}/${l}/${g}: ${out}`);
    if (l === 'en') assert.equal(out, personalize(tip.text[tier][li], { gender: 'male', name }), `English must not depend on gender: ${tip.id}`);
  }
});
test('Hebrew gender tokens: male/female forms; unspecified gets a slash form', () => {
  const m = '{תנשום|תנשמי} עכשיו'; assert.equal(gendered(m, 'male'), 'תנשום עכשיו'); assert.equal(gendered(m, 'female'), 'תנשמי עכשיו'); assert.equal(gendered(m, 'other'), 'תנשום/תנשמי עכשיו');
  assert.equal(gendered('{a|b|c}', 'other'), 'c'); assert.equal(gendered('{same|same}', 'other'), 'same'); assert.equal(gendered('hello {name}', 'male'), 'hello {name}');
});
test('feedback pools resolve for all genders and kid extras', () => {
  for (const l of ['en', 'he']) for (const pool of [...Object.values(POOLS[l]), ...Object.values(KID_EXTRA[l])]) for (const msg of pool) for (const g of GENDERS) assert.ok(!/[{}|]/.test(personalize(msg, { gender: g, name: 'X' })), msg);
  assert.deepEqual(Object.keys(KID_EXTRA.en), Object.keys(KID_EXTRA.he));
});
test('audience tiers from age', () => { assert.equal(audience(8), 'kid'); assert.equal(audience(11), 'kid'); assert.equal(audience(12), 'teen'); assert.equal(audience(17), 'teen'); assert.equal(audience(18), 'adult'); assert.equal(audience(null), 'adult'); assert.equal(audience('x'), 'adult'); });
test('pickTip: personalised by tier/gender/name, prefers the situation, no repeats until exhausted', () => {
  const kid = pickTip({ situation: 'late', lang: 'he', age: 8, gender: 'female', name: 'נועה', rnd: () => 0 });
  const adult = pickTip({ situation: 'late', lang: 'he', age: 40, gender: 'male', rnd: () => 0 });
  assert.notEqual(kid.text, adult.text); assert.ok(!/[{}]/.test(kid.text + adult.text));
  const seen = new Set(), ids = []; const sit = TIPS.filter((x) => x.sit === 'stuck' || x.sit === 'any').length;
  for (let i = 0; i < sit; i++) ids.push(pickTip({ situation: 'stuck', seen }).id); assert.equal(new Set(ids).size, sit, 'no repeats before the pool is exhausted');
  assert.ok(pickTip({ situation: 'stuck', seen }), 'pool resets after exhaustion');
  let exact = 0; for (let i = 0; i < 200; i++) { const t = pickTip({ situation: 'late', seen: new Set() }); if (TIPS.find((x) => x.id === t.id).sit === 'late') exact++; } assert.ok(exact > 120, `exact-situation preference ${exact}/200`);
});
const tpl = { id: 't', name: 'n', icon: 'i', color: '#000000', tasks: [{ id: 'a', name: 'A', sec: 60, est: 0 }, { id: 'b', name: 'B', sec: 600, est: 0 }] };
test('coachTrigger: overtime once per task, 90s cooldown, long pause once, behind-plan every 5 min, silent when on track', () => {
  const memo = newMemo(), run = E.createRun(tpl, 0);
  assert.equal(coachTrigger(run, 30_000, memo), null); assert.equal(coachTrigger(run, 70_000, memo), null, 'only 10s over');
  assert.equal(coachTrigger(run, 76_000, memo), 'late'); assert.equal(coachTrigger(run, 90_000, memo), null, 'cooldown'); assert.equal(coachTrigger(run, 200_000, memo), null, 'once per task');
  const m2 = newMemo(), r2 = E.createRun(tpl, 0); E.pause(r2, 1000);
  assert.equal(coachTrigger(r2, 100_000, m2), null); assert.equal(coachTrigger(r2, 125_000, m2), 'stuck'); assert.equal(coachTrigger(r2, 300_000, m2), null, 'once per pause');
  const m3 = newMemo(), r3 = E.createRun({ ...tpl, tasks: [{ id: 'a', name: 'A', sec: 600, est: 0 }] }, 0); E.addTime(r3, 0, 0);
  assert.equal(coachTrigger(r3, 100_000, m3), null, 'on track'); assert.equal(E.paceDiffSec(r3, 100_000), 0);
  const m4 = newMemo(), r4 = E.createRun({ ...tpl, tasks: [{ id: 'a', name: 'A', sec: 100, est: 0 }, { id: 'b', name: 'B', sec: 100, est: 0 }] }, 0);
  E.completeCurrent(r4, 400_000); assert.equal(E.paceDiffSec(r4, 400_000), 300); assert.equal(coachTrigger(r4, 400_000, m4), 'late'); assert.equal(coachTrigger(r4, 480_000, m4), null, 'cooldown'); assert.equal(coachTrigger(r4, 520_000, m4), 'late', 'task B now 20s over');
  assert.equal(coachTrigger(E.finish(r4, 500_000), 600_000, newMemo()), null, 'finished run');
});
test('voice presets are sane', () => { for (const p of Object.values(PRESETS)) { assert.ok(p.pitch >= 0 && p.pitch <= 2 && p.rate >= 0.1 && p.rate <= 10 && p.emoji); } assert.ok(Object.keys(PRESETS).length >= 8); });

test('attention / executive-function categories are present and balanced (start, memory, switch + focus/time)', () => {
  const by = (c) => TIPS.filter((x) => x.cat === c);
  for (const [c, min] of Object.entries({ start: 4, memory: 4, switch: 3, focus: 8, time: 7, think: 8 })) assert.ok(by(c).length >= min, `${c}: ${by(c).length}`);
  for (const c of ['start', 'memory', 'switch']) assert.ok(CATEGORIES[c]?.emoji, c);
  for (const sit of ['any', 'late', 'stuck']) assert.ok(TIPS.filter((x) => x.sit === sit).length >= 15, sit);
  // adults get the "why it works" register, kids get play: the tiers must really differ for every tip
  for (const tip of TIPS) assert.notEqual(tip.text.kid[0], tip.text.adult[0], tip.id);
});
test('every event has several encouragement variants in both languages', () => {
  for (const l of ['en', 'he']) for (const [ev, pool] of Object.entries(POOLS[l])) assert.ok(pool.length >= 6, `${l}/${ev}: ${pool.length}`);
});
