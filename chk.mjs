import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root='/home/user/morning_organizer/web', out='/tmp/claude-0/-home-user-morning-organizer/e89214a1-e8ee-55ea-b012-6cc1a350fc90/scratchpad/shots';
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const srv=http.createServer((q,r)=>{let u=q.url.split('?')[0];let f=path.join(root,u==='/'?'index.html':u);try{const d=fs.readFileSync(f);r.setHeader('content-type',types[path.extname(f)]||'application/octet-stream');r.end(d)}catch{r.statusCode=404;r.end()}}).listen(0);
const base=`http://localhost:${srv.address().port}/`;const b=await chromium.launch();
const find = () => { const bad=[]; const vw=document.documentElement.clientWidth;
  for (const e of document.querySelectorAll('body *')) { if (!e.getClientRects().length) continue; const cs=getComputedStyle(e); if (cs.visibility==='hidden'||cs.display==='none') continue;
    const r=e.getBoundingClientRect(); if (!r.width) continue; const p=e.parentElement; const pr=p.getBoundingClientRect();
    const hasText=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
    const own = hasText && (e.scrollWidth>e.clientWidth+2) && cs.overflowX!=='visible' && cs.textOverflow!=='ellipsis';
    const beyondViewport = hasText && (r.right>vw+1||r.left<-1);
    const beyondParent = hasText && pr.width>0 && (r.right>pr.right+2||r.left<pr.left-2) && getComputedStyle(p).overflowX!=='auto' && getComputedStyle(p).overflowX!=='scroll';
    if (own||beyondViewport||beyondParent) bad.push((e.className||e.tagName)+': '+e.textContent.trim().slice(0,40)+(own?' [own]':beyondViewport?' [viewport]':' [parent]')); }
  return [...new Set(bad)].slice(0,8); };
const results=[];
for (const lang of ['he','en']) for (const [w,fs_] of [[320,100],[390,150]]) {
  const ctx=await b.newContext({viewport:{width:w,height:800},serviceWorkers:'block',locale:lang==='he'?'he-IL':'en-US',reducedMotion:'reduce'});
  const p=await ctx.newPage(); await p.goto(base+'#/'); await p.waitForTimeout(700);
  await p.locator('dialog.welcome footer button').first().click({timeout:1500}).catch(()=>{});
  await p.evaluate(async([l,f])=>{const S=await import('./js/store.js'); await S.updateSettings({lang:l,fontScale:f,scoring:'custom'}); localStorage.setItem('mo.sg', JSON.stringify(Object.fromEntries(['needs','people','look','profile','helpers','buddy','pace','a11y','coach','voice','points','voicecmd','alerts','defaults','sync','app'].map(k=>[k,true])))); await S.saveProfile({name:'Dana'});},[lang,fs_]); await p.reload(); await p.waitForTimeout(600);
  await p.locator('dialog.welcome footer button').first().click({timeout:1500}).catch(()=>{});
  const id=await p.evaluate(async()=>{const S=await import('./js/store.js'); const x=S.newTemplate('Demo'); x.tasks=[{...S.newTask(),name:'A',sec:60,award:'trophy',pts:20,helper:'anchor'},{...S.newTask(),name:'B',sec:60}]; await S.saveTemplate(x); return x.id;});
  const pages=['#/','#/nlp','#/settings','#/stats','#/edit/'+id,'#/alarms','#/goals','#/calm','#/library','#/guide','#/journal','#/family'];
  for (const h of pages) { await p.goto(base+h); await p.waitForTimeout(450); await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true)); await p.waitForTimeout(150); const bad=await p.evaluate(find); if (bad.length) results.push(`${lang} ${w}/${fs_} ${h}: ${bad.join(' | ')}`); }
  // dialogs
  const dialogs=[['#/nlp','.nlp-tool >> nth=0'],['#/settings/needs','details[data-group=needs] .btn.primary']];
  for (const [h,sel] of dialogs) { await p.goto(base+h); await p.waitForTimeout(400); await p.click(sel).catch(()=>{}); await p.waitForTimeout(300); if (h==='#/settings/needs') await p.click('dialog[open] .needs-opt >> nth=3').catch(()=>{}); const bad=await p.evaluate(find); if (bad.length) results.push(`${lang} ${w}/${fs_} dialog ${h}: ${bad.join(' | ')}`); await p.keyboard.press('Escape'); }
  await p.goto(base+'#/'); await p.waitForTimeout(300); await p.evaluate(()=>document.querySelector('.tb-btn[data-tb="plan"]').click()); await p.click('.tb-panel button:has-text("🔁")').catch(()=>{}); await p.waitForTimeout(300); { const bad=await p.evaluate(find); if (bad.length) results.push(`${lang} ${w}/${fs_} dialog rio: ${bad.join(' | ')}`); } await p.keyboard.press('Escape');
  await p.goto(base+'#/run/'+id); await p.waitForSelector('.main-btns'); for(let i=0;i<4&&!(await p.locator('.summary').count());i++) await p.click('.main-btns .primary',{timeout:2000}).catch(()=>{}); await p.waitForTimeout(500); { const bad=await p.evaluate(find); if (bad.length) results.push(`${lang} ${w}/${fs_} summary: ${bad.join(' | ')}`); }
  if (lang==='he'&&w===320) { await p.goto(base+'#/nlp'); await p.waitForTimeout(400); await p.screenshot({path:`${out}/ov-nlp-320.png`}); }
  await ctx.close();
}
console.log(results.join('\n')||'no overflow found'); await b.close(); srv.close();
