import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkSvg, parsePack, sanitizeKit, defaultKit, DEFAULT_PARTS, DEFAULT_COLORS, PICK_SLOTS, COLOR_KEYS, STATES, ANIM_NAMES, FEELING_NAMES, stateOf, randomKit, encodeKit, decodeKit, sanitizeLib, libUpsert, libRemove, libDuplicate, MAX_LIB, optionOf, unlocked, TABS, LAYERS } from '../../web/js/avatarKit.js';
import { sanitizeAvatar, avatarEmoji, shareableAvatar } from '../../web/js/avatar.js';
import { STR } from '../../web/js/i18n.js';

const raw = JSON.parse(fs.readFileSync(new URL('../../web/data/avatar-pack.json', import.meta.url), 'utf8'));
const pack = parsePack(raw);
test('the shipped pack passes the strict check: nothing dropped, every slot has options, the defaults exist', () => {
  assert.ok(pack); assert.equal(pack.dropped, 0);
  for (const s of PICK_SLOTS) assert.ok(pack.slots[s].options.length >= 3, s);
  for (const [s, id] of Object.entries(DEFAULT_PARTS)) assert.ok(pack.slots[s].options.some((o) => o.id === id), `default ${s}/${id}`);
  assert.ok(pack.slots.effects.options.length === 8 && pack.slots.arms.options.length === 1 && pack.slots.body.options.length === 1);
  assert.ok(pack.slots.hair.options.length >= 18 && pack.slots.outfit.options.length === 14);
  for (const k of COLOR_KEYS) assert.ok(pack.palettes[k].length >= 6, k);
  assert.ok(pack.slots.head.options.some((o) => o.unlock === 1) && PICK_SLOTS.every((s) => unlocked(pack, s, 1).length >= 1), 'level 1 has something in every slot');
  assert.ok(pack.slots.facial_hair.options.find((o) => o.id === 'none').unlock === 1, '"none" is always available');
  assert.ok(JSON.stringify(raw).length < 200_000);
  assert.ok(LAYERS.every((l) => pack.slots[l.split(':')[0]]) && TABS.flatMap(([, s]) => s).sort().join() === [...PICK_SLOTS].sort().join(), 'every slot is on a tab');
});
test('every animation and feeling uses variants that exist for every eye, brow and mouth style (so any mix works)', () => {
  for (const n of [...ANIM_NAMES, ...FEELING_NAMES]) {
    const st = STATES[n]; assert.ok(st, n);
    for (const o of pack.slots.eyes.options) assert.ok(o.variants[st.eyes], `${n} eyes ${o.id}`);
    for (const o of pack.slots.brows.options) assert.ok(o.variants[st.brows], `${n} brows ${o.id}`);
    for (const o of pack.slots.mouth.options) assert.ok(o.variants[st.mouth], `${n} mouth ${o.id}`);
    for (const a of st.arms) assert.ok(pack.slots.arms.options[0].variants[a], `${n} arms ${a}`);
    if (st.fx) assert.ok(pack.slots.effects.options.some((o) => o.id === st.fx), `${n} fx`);
  }
  assert.equal(stateOf('__proto__'), STATES.idle); assert.equal(stateOf('constructor'), STATES.idle); assert.equal(stateOf('wave'), STATES.wave);
});
test('SVG allow-list: scripts, styles, links, images, event attributes, outside references and broken markup are refused', () => {
  const ok = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256"><g id="a"><path class="c-skin" fill="#E8B48A" d="M0 0L5 5"/></g></svg>';
  assert.ok(checkSvg(ok)); assert.ok(checkSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256"/>'));
  for (const bad of ['<svg><script>alert(1)</script></svg>', '<svg><style>a{}</style></svg>', '<svg onload="x()"></svg>', '<svg><g onclick="x()"/></svg>', '<svg><image href="http://x"/></svg>', '<svg><use href="#a"/></svg>', '<svg><foreignObject/></svg>',
    '<svg><path fill="url(http://evil/x)"/></svg>', '<svg><path fill="url(#missing)"/></svg>', '<svg><path style="fill:red"/></svg>', '<svg><g><path/></svg>', '<svg><text>hi</text></svg>', '<svg><path d="M0 0"/>stray</svg>', '<!DOCTYPE x><svg/>', '<svg><path href="javascript:x"/></svg>', 'nope', 5, null, `${ok}${' '.repeat(9000)}`]) assert.equal(checkSvg(bad), false, String(bad).slice(0, 40));
  assert.ok(checkSvg('<svg viewBox="0 0 1 1"><defs><linearGradient id="g1"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect fill="url(#g1)" x="0" y="0" width="1" height="1"/></svg>'));
  const evil = structuredClone(raw); evil.slots.hair.options[0].variants.front = '<svg><script/></svg>'; const p2 = parsePack(evil); assert.equal(p2.dropped, 1); assert.ok(!p2.slots.hair.options.some((o) => o.id === raw.slots.hair.options[0].id));
  assert.equal(parsePack({}), null); assert.equal(parsePack(null), null); assert.equal(parsePack({ ...raw, version: 2 }), null);
});
test('a kit avatar: always complete and clean; unknown keys, bad ids and bad colours fall back; prototype keys are ignored', () => {
  const d = defaultKit(); assert.equal(d.k, 'kit'); assert.deepEqual(Object.keys(d.p), PICK_SLOTS); assert.deepEqual(d.c, DEFAULT_COLORS);
  const k = sanitizeKit({ p: { hair: 'afro', head: 'BAD ID!', eyes: 5, evil: 'x', __proto__: { mouth: 'x' } }, c: { skin: '#abcdef', hair: 'red', eye: '#12345' } });
  assert.equal(k.p.hair, 'afro'); assert.equal(k.p.head, DEFAULT_PARTS.head); assert.equal(k.p.eyes, DEFAULT_PARTS.eyes); assert.equal(k.p.evil, undefined); assert.equal(k.c.skin, '#ABCDEF'); assert.equal(k.c.hair, DEFAULT_COLORS.hair); assert.equal(k.c.eye, DEFAULT_COLORS.eye);
  assert.deepEqual(sanitizeKit(null), d); assert.deepEqual(sanitizeKit('x'), d);
  assert.equal(sanitizeAvatar({ k: 'kit', p: { hair: 'bob' } }).p.hair, 'bob'); assert.equal(sanitizeAvatar({ k: 'kit' }).k, 'kit'); assert.equal(avatarEmoji(d), '🙂'); assert.equal(shareableAvatar(d).k, 'kit');
  assert.equal(optionOf(pack, 'hair', 'nope').id, pack.slots.hair.options[0].id);
});
test('random avatar: only unlocked options, colours from the palettes, deterministic with a seed', () => {
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const a = randomKit(pack, 1, rnd); for (const sl of PICK_SLOTS) assert.ok(unlocked(pack, sl, 1).some((o) => o.id === a.p[sl]), sl);
  for (const c of COLOR_KEYS) assert.ok(pack.palettes[c].includes(a.c[c]), c);
  s = 7; assert.deepEqual(randomKit(pack, 1, rnd), a);
});
test('share code: short, round-trips (with a name), refuses junk and oversized input, never throws', () => {
  const kit = sanitizeKit({ p: { hair: 'afro', glasses: 'round' }, c: { skin: '#8D5524' } }), code = encodeKit(kit, 'Dana');
  assert.match(code, /^SRAV1\.[A-Za-z0-9_-]+$/); assert.ok(code.length < 600, String(code.length));
  const back = decodeKit(`hello ${code} bye`); assert.deepEqual(back.avatar, kit); assert.equal(back.name, 'Dana');
  assert.equal(decodeKit(encodeKit(kit, 'דנה 🌞')).name, 'דנה 🌞');
  for (const bad of ['', 'SRAV1.', 'SRAV1.!!!!', 'SRAV1.' + 'A'.repeat(40), 'SRAV1.' + 'A'.repeat(5000), null, undefined, 5, 'M2.abcdef']) assert.equal(decodeKit(bad), null, String(bad).slice(0, 20));
  const hostile = `SRAV1.${Buffer.from(JSON.stringify([['<script>', 'x'], ['zzzzzz'], 'n'.repeat(500)])).toString('base64url')}`; const h = decodeKit(hostile); assert.ok(h); assert.equal(h.avatar.p.head, DEFAULT_PARTS.head); assert.ok(h.name.length <= 30);
});
test('My avatars: save, rename (replace by id), duplicate, delete, limit, clean on read', () => {
  let lib = []; const a = { id: 'a1', name: 'First', avatar: defaultKit(), at: 1 };
  lib = libUpsert(lib, a); assert.equal(lib.length, 1); lib = libUpsert(lib, { ...a, name: 'Renamed' }); assert.equal(lib.length, 1); assert.equal(lib[0].name, 'Renamed');
  lib = libDuplicate(lib, 'a1', '(copy)'); assert.equal(lib.length, 2); assert.equal(lib[0].name, 'Renamed (copy)'); assert.notEqual(lib[0].id, 'a1');
  lib = libRemove(lib, 'a1'); assert.equal(lib.length, 1); assert.deepEqual(libDuplicate(lib, 'nope'), lib);
  let full = []; for (let i = 0; i < MAX_LIB; i++) full = libUpsert(full, { id: `x${i}`, name: `n${i}`, avatar: defaultKit() }); assert.equal(libUpsert(full, { id: 'new', name: 'n', avatar: defaultKit() }), null, 'full'); assert.equal(libUpsert(full, { id: 'x3', name: 'again', avatar: defaultKit() }).length, MAX_LIB);
  const clean = sanitizeLib([{ id: 'd', name: 'x'.repeat(99), avatar: { k: 'kit', p: { hair: '??' } } }, { id: 'd' }, null, 5]); assert.equal(clean.length, 1); assert.ok(clean[0].name.length <= 30); assert.equal(clean[0].avatar.p.hair, DEFAULT_PARTS.hair); assert.deepEqual(sanitizeLib('x'), []);
});
test('avatar texts exist in both languages', () => {
  for (const l of ['en', 'he']) for (const k of ['avkTitle', 'avkSave', 'avkUse', 'avkShare', 'avkRandom', 'avkLibrary', 'avkImport']) assert.ok(STR[l][k], `${l} ${k}`);
});
