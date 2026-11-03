// Fast repo-wide guards run in CI and by the release checklist: syntax, banned APIs (security), file hygiene.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const js = walk('web').filter((f) => f.endsWith('.js'));
let bad = 0; const fail = (m) => { console.error('✖', m); bad++; };

for (const f of js) { try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { fail(`syntax: ${f}\n${e.stderr}`); } }

// Security: user data must never reach an HTML sink or eval-like API. h() builds text nodes only.
const BANNED = [[/\binnerHTML\b/, 'innerHTML'], [/\bouterHTML\b/, 'outerHTML'], [/\binsertAdjacentHTML\b/, 'insertAdjacentHTML'], [/\beval\s*\(/, 'eval'], [/new Function\s*\(/, 'new Function'], [/document\.write\s*\(/, 'document.write'], [/\bsetTimeout\s*\(\s*['"`]/, 'string setTimeout']];
for (const f of js) { const src = readFileSync(f, 'utf8'); for (const [re, name] of BANNED) if (re.test(src)) fail(`${f}: uses ${name}`); }

// No remote code/fonts/analytics: the CSP says 'self' only, make sure the sources agree.
for (const f of [...js, 'web/index.html', 'web/css/app.css']) {
  const src = readFileSync(f, 'utf8').replace(/https:\/\/(github\.com|ohadsam\.github\.io)\S*/g, '');
  if (/https?:\/\/(?!www\.w3\.org)/.test(src.replace(/^\s*\/\/.*$/gm, ''))) fail(`${f}: external URL (CSP is 'self' only)`);
}
if (/ style="/.test(readFileSync('web/index.html', 'utf8').replace(/<noscript>[\s\S]*<\/noscript>/, ''))) fail('web/index.html: inline style attribute is blocked by CSP');

// Every file the service worker precaches must exist; every web .js must be precached (otherwise offline breaks).
const sw = readFileSync('web/sw.js', 'utf8');
const shell = [...sw.matchAll(/'([^']+\.(?:js|css|html|json|svg|png|webmanifest))'/g)].map((m) => m[1]);
for (const p of shell) { try { statSync(join('web', p)); } catch { fail(`sw.js precaches missing file ${p}`); } }
for (const f of js) { const rel = f.replace(/^web\//, ''); if (rel !== 'sw.js' && !shell.includes(rel)) fail(`${rel} is not in sw.js SHELL (offline would break)`); }

console.log(bad ? `\n${bad} problem(s)` : `static checks ok (${js.length} js files)`);
process.exit(bad ? 1 : 0);
