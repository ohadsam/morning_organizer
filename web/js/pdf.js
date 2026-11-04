// A real PDF file without any library: the report is drawn in the browser (so Hebrew/RTL, emoji and charts look exactly like on screen), cut into
// A4 pages at section boundaries and wrapped in a minimal PDF (one JPEG per page). Text is not selectable - the picture is the report.
const A4_W = 595.28, A4_H = 841.89, enc = new TextEncoder();

/** pages: [{ jpeg: Uint8Array, w, h, frac }] (frac = used height / page height, 0-1). -> Uint8Array */
export function buildPdf(pages, { title = 'Report' } = {}) {
  const chunks = [], offsets = []; let len = 0;
  const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); len += b.length; };
  const obj = (id, body) => { offsets[id] = len; push(`${id} 0 obj\n`); push(body); push('\nendobj\n'); };
  const n = pages.length, pageId = (i) => 3 + i * 3, contentId = (i) => 4 + i * 3, imageId = (i) => 5 + i * 3, infoId = 3 + n * 3;
  push('%PDF-1.4\n%âãÏÓ\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Count ${n} /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(' ')}] >>`);
  pages.forEach((p, i) => {
    const dh = (A4_H * p.frac).toFixed(2), y = (A4_H - A4_H * p.frac).toFixed(2), content = `q ${A4_W} 0 0 ${dh} 0 ${y} cm /Im0 Do Q`;
    obj(pageId(i), `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] /Resources << /XObject << /Im0 ${imageId(i)} 0 R >> >> /Contents ${contentId(i)} 0 R >>`);
    obj(contentId(i), `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    offsets[imageId(i)] = len; push(`${imageId(i)} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`); push(p.jpeg); push('\nendstream\nendobj\n');
  });
  const safe = String(title).replace(/[^\x20-\x7e]/g, '?').replace(/[()\\]/g, '');
  obj(infoId, `<< /Title (${safe}) /Producer (SonRise) >>`);
  const xref = len, total = infoId + 1;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`); for (let i = 1; i < total; i++) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${total} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(len); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/**
 * Renders an element (that carries its own <style> and sections with class "rpt-sec") into JPEG pages.
 * width = CSS px of the page; scale = sharpness. -> [{ jpeg, w, h, frac }]
 */
export async function elementToPages(el, { width = 794, scale = 2, css = '' } = {}) {
  const host = document.createElement('div'); host.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;background:#fff`; host.append(el); document.body.append(host);
  try {
    el.style.position = 'relative'; el.style.width = `${width}px`;
    const H = Math.ceil(el.scrollHeight), tops = [...el.querySelectorAll('.rpt-sec')].map((s) => ({ top: s.offsetTop, bottom: s.offsetTop + s.offsetHeight }));
    // the stylesheet is embedded INTO the image document (the page itself stays free of inline styles for its CSP)
    const xhtml = `<style xmlns="http://www.w3.org/1999/xhtml">${css.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</style>${new XMLSerializer().serializeToString(el)}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}"><foreignObject x="0" y="0" width="${width}" height="${H}">${xhtml}</foreignObject></svg>`;
    const img = new Image(); img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; await img.decode();
    const k = Math.min(scale, 15000 / H), cw = Math.round(width * k), ch = Math.round(H * k), full = document.createElement('canvas'); full.width = cw; full.height = ch;
    const g = full.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch); g.drawImage(img, 0, 0, cw, ch);
    const pageH = Math.round(width * (A4_H / A4_W)), cuts = [0];
    for (const s of tops) { const start = cuts.at(-1); if (s.bottom - start > pageH && s.top > start + 40) cuts.push(s.top); }
    cuts.push(H); const pages = [];
    for (let i = 0; i < cuts.length - 1; i++) for (let y = cuts[i]; y < cuts[i + 1]; y += pageH) {
      const h = Math.min(pageH, cuts[i + 1] - y), c = document.createElement('canvas'); c.width = cw; c.height = Math.max(1, Math.round(h * k));
      const cg = c.getContext('2d'); cg.fillStyle = '#fff'; cg.fillRect(0, 0, c.width, c.height); cg.drawImage(full, 0, Math.round(y * k), cw, c.height, 0, 0, cw, c.height);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92)); pages.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), w: c.width, h: c.height, frac: h / pageH });
    }
    return pages;
  } finally { host.remove(); }
}
export async function elementToPdf(el, title, opts) { return new Blob([buildPdf(await elementToPages(el, opts), { title })], { type: 'application/pdf' }); }
