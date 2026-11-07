import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseVisualKit, SKIN_PACK, MOOD_FACES } from '../../web/js/visualKit.js';
import { checkIconSvg, checkSvg } from '../../web/js/avatarKit.js';
import { SKINS } from '../../web/js/skins.js';

const raw = JSON.parse(fs.readFileSync(new URL('../../web/data/visual-kit.json', import.meta.url), 'utf8'));
const kit = parseVisualKit(raw), css = fs.readFileSync(new URL('../../web/css/app.css', import.meta.url), 'utf8');
test('the shipped visual kit passes the strict check: nothing dropped, illustrations and feelings present, a colour set per look', () => {
  assert.ok(kit); assert.equal(kit.dropped, 0); assert.equal(Object.keys(kit.art).length, 21); assert.equal(Object.keys(kit.feelings).length, 32); assert.equal(kit.packs.length, 8);
  for (const id of Object.values(MOOD_FACES)) assert.ok(kit.feelings[id], id);
  for (const id of ['empty-routines', 'empty-history', 'empty-goals', 'empty-journal', 'empty-alarms', 'welcome-1']) assert.ok(kit.art[id], id);
  assert.deepEqual(Object.keys(SKIN_PACK).sort(), [...SKINS].sort(), 'every look has a colour set'); for (const p of Object.values(SKIN_PACK)) assert.ok(kit.packs.some((x) => x.id === p), p);
  assert.ok(JSON.stringify(raw).length < 150_000);
});
test('the CSS colours of every look are exactly the pack colours (so the artwork follows the skin, in light and dark)', () => {
  for (const [skin, pid] of Object.entries(SKIN_PACK)) {
    const pack = kit.packs.find((p) => p.id === pid), sel = skin === 'default' ? ':root' : `:root[data-skin="${skin}"]`;
    for (const mode of ['light', 'dark']) {
      const decl = pack.k[mode].map((c, i) => `--k${i + 1}:${c}`).join(';'), block = mode === 'dark' ? `${sel}[data-theme="dark"] { ${decl} }` : `${sel} { ${decl} }`;
      assert.ok(css.includes(block), `${skin} ${mode}`);
    }
  }
});
test('icon SVG check: allows fill-rule and pathLength, still refuses scripts, styles, links and outside references', () => {
  assert.ok(checkIconSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path pathLength="1" fill-rule="evenodd" class="k1" d="M0 0L1 1"/></svg>'));
  assert.equal(checkSvg('<svg viewBox="0 0 1 1"><path fill-rule="evenodd" d="M0 0"/></svg>'), false, 'avatar parts keep the narrower list');
  for (const bad of ['<svg><script/></svg>', '<svg><style/></svg>', '<svg><image href="x"/></svg>', '<svg><path fill="url(http://x)"/></svg>', '<svg onload="x"/>', '<svg><text>a</text></svg>']) assert.equal(checkIconSvg(bad), false, bad);
  const evil = structuredClone(raw); evil.art['empty-routines'].svg = '<svg><script/></svg>'; evil.feelings['x y'] = { svg: '<svg/>' }; const p = parseVisualKit(evil); assert.equal(p.dropped, 2); assert.ok(!p.art['empty-routines']);
  assert.equal(parseVisualKit(null), null); assert.equal(parseVisualKit({ format: 'x' }), null); assert.equal(parseVisualKit({ format: 'sonrise-visual-kit', version: 1 }), null);
});
