// Usage: node scripts/bump-version.mjs <major|minor|patch|x.y.z>
// Updates web/version.json (single source of truth: also read by Gradle), web/sw.js, package.json.
import { readFileSync, writeFileSync } from 'node:fs';
const v = JSON.parse(readFileSync('web/version.json', 'utf8'));
const arg = process.argv[2] || 'patch';
let [a, b, c] = v.version.split('.').map(Number);
if (/^\d+\.\d+\.\d+$/.test(arg)) [a, b, c] = arg.split('.').map(Number);
else if (arg === 'major') { a++; b = 0; c = 0; } else if (arg === 'minor') { b++; c = 0; } else c++;
const next = `${a}.${b}.${c}`;
writeFileSync('web/version.json', JSON.stringify({ version: next, versionCode: v.versionCode + 1 }) + '\n');
writeFileSync('web/sw.js', readFileSync('web/sw.js', 'utf8').replace(/const VERSION = '[^']+'/, `const VERSION = '${next}'`));
const pkg = JSON.parse(readFileSync('package.json', 'utf8')); pkg.version = next; writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log(`version -> ${next} (code ${v.versionCode + 1}). Now add a CHANGELOG entry + What's New.`);
