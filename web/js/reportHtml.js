// The interactive HTML report (pure string building): ONE self-contained file - the same designed report, plus tabs (7 / 30 / 90 days / all),
// animations (sections slide in, bars grow, charts draw, numbers count up, calendar cells pop) and collapsible sections. No network, no libraries.
// The report DOM (built from text nodes) is serialised by serializeNode() below, which escapes every text and attribute value - user data is never pasted into markup.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const EXTRA_CSS = `
html{scroll-behavior:smooth}body{margin:0;background:#f1efff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#2d3436}
.app{max-width:880px;margin:0 auto;padding:14px 14px 40px}.bar-top{position:sticky;top:0;z-index:5;background:rgba(241,239,255,.92);backdrop-filter:blur(8px);padding:10px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between}
.bar-top h1{font-size:18px;margin:0;color:#4b3fc4}.tabs{display:flex;gap:6px;flex-wrap:wrap}.tabs button,.pbtn{font:inherit;border:2px solid #d9d4ff;background:#fff;color:#2d3436;border-radius:99px;padding:6px 14px;cursor:pointer;min-height:40px}
.tabs button[aria-selected=true]{background:#6c5ce7;border-color:#6c5ce7;color:#fff;font-weight:700}.tabs button:focus-visible,.pbtn:focus-visible,.rpt-sec h2:focus-visible{outline:3px solid #6c5ce7;outline-offset:2px}
.rpt-page{margin-top:10px;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(75,63,196,.18);background:#fff}
.js .panel{display:none}.js .panel.on{display:block;animation:fade .5s ease}@keyframes fade{from{opacity:0;transform:translateY(8px)}}
.js .rpt-sec{opacity:0;transform:translateY(22px);transition:opacity .7s ease,transform .7s ease}.js .rpt-sec.in{opacity:1;transform:none}
.js .rpt-head{animation:slide 1s ease both}@keyframes slide{from{opacity:0;transform:translateY(-14px)}}
.rpt-bar .fl{transition:width 1.1s cubic-bezier(.2,.8,.2,1)}.rpt-heat i{transition:transform .45s cubic-bezier(.2,1.6,.4,1),background .3s}.js .rpt-sec:not(.in) .rpt-heat i{transform:scale(0)}
.js .rpt-sec polyline:not([stroke-dasharray]){stroke-dasharray:var(--len,2000);stroke-dashoffset:var(--len,2000);transition:stroke-dashoffset 1.8s ease}.js .rpt-sec.in polyline:not([stroke-dasharray]){stroke-dashoffset:0}
.js .rpt-sec circle{opacity:0;transition:opacity .4s 1.4s}.js .rpt-sec.in circle{opacity:1}.rpt-sec circle:hover{r:7}.rpt-kpi{transition:transform .25s}.rpt-kpi:hover{transform:translateY(-3px) scale(1.03)}
.rpt-sec h2{cursor:pointer;user-select:none}.rpt-sec h2::after{content:'▾';margin-inline-start:8px;font-size:12px;opacity:.5;display:inline-block;transition:transform .3s}.rpt-sec.closed h2::after{transform:rotate(-90deg)}.rpt-sec.closed>*:not(h2){display:none}
.rpt-bar:hover .tr{background:#dfe6e9}@media print{.bar-top{display:none}.js .rpt-sec{opacity:1;transform:none}.js .panel{display:block}.panel:not(.on){display:none!important}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.js .rpt-sec{opacity:1;transform:none}.js .rpt-sec polyline:not([stroke-dasharray]){stroke-dashoffset:0}.js .rpt-sec circle{opacity:1}.js .rpt-sec:not(.in) .rpt-heat i{transform:none}}
`;

// Small, dependency-free behaviour. Written as a plain string so it can be embedded as-is (no user data is ever interpolated into it).
export const SCRIPT = `(()=>{document.documentElement.classList.add('js');
const $=(s,r=document)=>[...r.querySelectorAll(s)],reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const panels=$('.panel'),tabs=$('.tabs button');
panels.forEach(p=>{$('.rpt-bar .fl',p).forEach(f=>{f.dataset.w=f.style.width});$('polyline:not([stroke-dasharray])',p).forEach(l=>{try{l.style.setProperty('--len',Math.ceil(l.getTotalLength()))}catch(e){}});
$('.rpt-heat i',p).forEach((e,i)=>{e.style.transitionDelay=(i*16)+'ms'});$('.rpt-kpi b',p).forEach(b=>{b.dataset.t=b.textContent});
$('.rpt-sec h2',p).forEach(h=>{h.tabIndex=0;h.setAttribute('role','button');const tg=()=>{const s=h.parentNode;s.classList.toggle('closed');h.setAttribute('aria-expanded',String(!s.classList.contains('closed')))};h.setAttribute('aria-expanded','true');h.addEventListener('click',tg);h.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tg()}})})});
function count(b){const t=b.dataset.t,m=t.match(/^(\\D*)(\\d+(?:[.,]\\d+)?)(.*)$/);if(!m||reduce)return;const end=parseFloat(m[2].replace(',','.')),dec=(m[2].split(/[.,]/)[1]||'').length,t0=performance.now();(function s(n){const k=Math.min(1,(n-t0)/900),e=1-Math.pow(1-k,3);b.textContent=m[1]+(end*e).toFixed(dec)+m[3];if(k<1)requestAnimationFrame(s);else b.textContent=t})(t0)}
function reveal(s){s.classList.add('in');$('.fl',s).forEach(f=>{f.style.width=f.dataset.w});$('.rpt-kpi b',s).forEach(count)}
const io='IntersectionObserver'in window&&!reduce?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){reveal(e.target);io.unobserve(e.target)}}),{threshold:.12}):null;
function show(i){tabs.forEach((t,k)=>t.setAttribute('aria-selected',String(k===i)));panels.forEach((p,k)=>{p.classList.toggle('on',k===i);if(k!==i)return;
$('.rpt-sec',p).forEach(s=>{s.classList.remove('in');if(io){$('.fl',s).forEach(f=>{f.style.width='0'});io.observe(s)}else reveal(s)})})}
tabs.forEach((t,i)=>t.addEventListener('click',()=>show(i)));document.getElementById('print').addEventListener('click',()=>print());show(0)})();`;

const VOID = new Set(['area', 'br', 'col', 'hr', 'img', 'input', 'link', 'meta', 'source', 'wbr']);
/** DOM node -> HTML text. Escapes text and attribute values; elements always get explicit end tags (valid for HTML and for inline SVG). */
export function serializeNode(n) {
  if (n.nodeType === 3) return esc(n.nodeValue).replace(/&quot;/g, '"');
  if (n.nodeType !== 1) return '';
  const tag = n.localName.toLowerCase();
  if (tag === 'script' || tag === 'iframe' || tag === 'object' || tag === 'embed') return '';
  const attrs = [...n.attributes].filter((a) => !/^on/i.test(a.name) && !/^\s*(javascript|data|vbscript):/i.test(a.value)).map((a) => ` ${a.name}="${esc(a.value)}"`).join('');
  return VOID.has(tag) ? `<${tag}${attrs}>` : `<${tag}${attrs}>${[...n.childNodes].map(serializeNode).join('')}</${tag}>`;
}
/** tabs: [{ label, html }] (html = serializeNode() of a report element). opts: { title, lang, dir, css, printLabel, footer }. -> full HTML document string. */
export function buildHtmlDocument(tabs, { title = 'Report', lang = 'en', dir = 'ltr', css = '', printLabel = 'Print' } = {}) {
  const bar = tabs.length > 1 ? `<div class="tabs" role="tablist">${tabs.map((x, i) => `<button type="button" role="tab" aria-selected="${i === 0}">${esc(x.label)}</button>`).join('')}</div>` : '<div class="tabs"><button type="button" role="tab" aria-selected="true" style="display:none"></button></div>';
  return `<!doctype html>\n<html lang="${esc(lang)}" dir="${esc(dir)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}${EXTRA_CSS}</style></head>
<body><div class="app"><div class="bar-top"><h1>${esc(title)}</h1>${bar}<button type="button" class="pbtn" id="print">🖨️ ${esc(printLabel)}</button></div>
${tabs.map((x, i) => `<div class="panel${i === 0 ? ' on' : ''}" role="tabpanel"><div class="rpt-page">${x.html}</div></div>`).join('\n')}
</div><script>${SCRIPT}</script></body></html>`;
}
