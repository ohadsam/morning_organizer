// Text-fit sweep: on every main screen and the main sheets, in Hebrew and English, at 320 px and at 390 px with 150% text, no visible text may spill out
// of its box, past its parent or off the screen, and nothing may be clipped vertically. (Scroll strips, screen-reader-only text and corner stickers are exempt.)
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'web');
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const srv=http.createServer((q,r)=>{let u=q.url.split('?')[0];let f=path.join(root,u==='/'?'index.html':u);try{const d=fs.readFileSync(f);r.setHeader('content-type',types[path.extname(f)]||'application/octet-stream');r.end(d)}catch{r.statusCode=404;r.end()}}).listen(0);
const base=`http://localhost:${srv.address().port}/`;const b=await chromium.launch();
const find = () => { const bad=[]; const vw=document.documentElement.clientWidth;
  for (const e of document.querySelectorAll('body *')) { if (!e.getClientRects().length) continue; const cs=getComputedStyle(e); if (cs.visibility==='hidden'||cs.display==='none') continue;
    const r=e.getBoundingClientRect(); if (!r.width || e.closest('.sb-jump, .sr-only, .alarm-sticker, .tb-panel, .anim-strip, .studio-tabs')) continue; const p=e.parentElement; const pr=p.getBoundingClientRect();
    const hasText=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
    const clipV = hasText && cs.overflowY!=='visible' && cs.overflowY!=='auto' && cs.overflowY!=='scroll' && e.scrollHeight>e.clientHeight+3;
    const own = hasText && (e.scrollWidth>e.clientWidth+2) && cs.overflowX!=='visible' && cs.textOverflow!=='ellipsis';
    const beyondViewport = hasText && (r.right>vw+1||r.left<-1);
    const beyondParent = hasText && pr.width>0 && (r.right>pr.right+2||r.left<pr.left-2) && getComputedStyle(p).overflowX!=='auto' && getComputedStyle(p).overflowX!=='scroll';
    if (clipV) bad.push((e.className||e.tagName)+': '+e.textContent.trim().slice(0,40)+' [clipped-vertically]');
    if (own||beyondViewport||beyondParent) bad.push((e.className||e.tagName)+': '+e.textContent.trim().slice(0,40)+(own?' [own]':beyondViewport?' [viewport]':' [parent]')); }
  return [...new Set(bad)].slice(0,8); };
const results=[];
for (const lang of ['he','en']) for (const [w,fs_] of [[320,100],[390,150]]) {
  const ctx=await b.newContext({viewport:{width:w,height:800},serviceWorkers:'block',locale:lang==='he'?'he-IL':'en-US',reducedMotion:'reduce'});
  const p=await ctx.newPage(); await p.goto(base+'#/'); await p.waitForTimeout(700);
  await p.locator('dialog.welcome footer button').first().click({timeout:1500}).catch(()=>{});
  await p.evaluate(async([l,f])=>{const S=await import('./js/store.js'); await S.updateSettings({lang:l,fontScale:f,scoring:'custom'}); localStorage.setItem('mo.sg', JSON.stringify(Object.fromEntries(['needs','people','look','profile','helpers','buddy','pace','a11y','coach','voice','points','voicecmd','alerts','defaults','sync','app'].map(k=>[k,true])))); await S.saveProfile({name:'Dana'}); await S.saveAvatarDesign({ id: 'a1', name: 'Demo avatar with a long name', avatar: { k: 'kit', p: { hair: 'afro' } } });},[lang,fs_]); await p.reload(); await p.waitForTimeout(600);
  await p.locator('dialog.welcome footer button').first().click({timeout:1500}).catch(()=>{});
  const id=await p.evaluate(async()=>{const S=await import('./js/store.js'); const x=S.newTemplate('Demo'); x.tasks=[{...S.newTask(),name:'A',sec:60,award:'trophy',pts:20,helper:'anchor'},{...S.newTask(),name:'B',sec:60}]; await S.saveTemplate(x); return x.id;});
  const pages=['#/','#/nlp','#/settings','#/stats','#/edit/'+id,'#/alarms','#/goals','#/calm','#/library','#/guide','#/journal','#/family'];
  for (const h of pages) { await p.goto(base+h); await p.waitForTimeout(450); await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true)); await p.waitForTimeout(150); const bad=await p.evaluate(find); if (bad.length) results.push(`${lang} ${w}/${fs_} ${h}: ${bad.join(' | ')}`); }
  // dialogs
  const dialogs=[['#/nlp','.nlp-tool >> nth=0'],['#/settings/needs','details[data-group=needs] .btn.primary']];
  for (const [h,sel] of dialogs) { await p.goto(base+h); await p.waitForTimeout(400); await p.click(sel).catch(()=>{}); await p.waitForTimeout(300); if (h==='#/settings/needs') await p.click('dialog[open] .needs-opt >> nth=3').catch(()=>{}); const bad=await p.evaluate(find); if (bad.length) results.push(`${lang} ${w}/${fs_} dialog ${h}: ${bad.join(' | ')}`); await p.keyboard.press('Escape'); }
  { await p.goto(base+'#/settings/profile'); await p.waitForTimeout(400); await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true)); await p.click('details[data-group=profile] .toolbar button >> nth=1').catch(()=>{}); await p.waitForSelector('dialog[open] .av-card',{timeout:3000}).catch(()=>{}); await p.waitForTimeout(300);
    let bad=await p.evaluate(find); if (bad.length) results.push(`${lang} ${w}/${fs_} dialog my-avatars: ${bad.join(' | ')}`);
    await p.click('dialog[open] .av-card button >> nth=1').catch(()=>{}); await p.waitForSelector('.studio .opt-tile',{timeout:3000}).catch(()=>{}); await p.waitForTimeout(500);
    for (const n of [0,1,2,3,4,5,6]) { await p.locator('.studio-tabs button').nth(n).click().catch(()=>{}); await p.waitForTimeout(200); bad=await p.evaluate(find); if (bad.length) results.push(`${lang} ${w}/${fs_} studio tab ${n}: ${bad.join(' | ')}`); }
    await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); 
    await p.evaluate(async()=>{const m=await import('./js/ui/avatarStudio.js'); m.openAvatarStudio({lvl:3});}); await p.waitForSelector('.studio .wiz-start',{timeout:3000}).catch(()=>{}); await p.waitForTimeout(400);
    for (let n=0;n<10;n++) { bad=await p.evaluate(find); if (bad.length) results.push(`${lang} ${w}/${fs_} avatar wizard step ${n}: ${bad.join(' | ')}`); if (n===0) await p.click('.wiz-start button >> nth=0').catch(()=>{}); else await p.locator('.studio .btn.primary:not(footer .btn)').first().click({timeout:800}).catch(()=>{}); await p.waitForTimeout(200); }
    await p.keyboard.press('Escape'); }
  await p.goto(base+'#/'); await p.waitForTimeout(300); await p.evaluate(()=>document.querySelector('.tb-btn[data-tb="plan"]').click()); await p.click('.tb-panel button:has-text("🔁")').catch(()=>{}); await p.waitForTimeout(300); { const bad=await p.evaluate(find); if (bad.length) results.push(`${lang} ${w}/${fs_} dialog rio: ${bad.join(' | ')}`); } await p.keyboard.press('Escape');
  await p.goto(base+'#/run/'+id); await p.waitForSelector('.main-btns'); for(let i=0;i<4&&!(await p.locator('.summary').count());i++) await p.click('.main-btns .primary',{timeout:2000}).catch(()=>{}); await p.waitForTimeout(500); { const bad=await p.evaluate(find); if (bad.length) results.push(`${lang} ${w}/${fs_} summary: ${bad.join(' | ')}`); }
  await ctx.close();
}
await b.close(); srv.close();
if (results.length) { console.error('Text does not fit:\n' + results.join('\n')); process.exit(1); }
console.log('text fit ok');
