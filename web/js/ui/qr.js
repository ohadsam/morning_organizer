// Showing a QR code and scanning one. Scanning: the Android app uses Google's code scanner (no camera permission needed);
// browsers use the BarcodeDetector API with the camera where it exists (Chrome on Android); otherwise people paste the code.
import { h } from '../util.js';
import { t } from '../i18n.js';
import { makeQr } from '../qr.js';
import { native } from '../native.js';
import { modal, toast } from './common.js';

const NS = 'http://www.w3.org/2000/svg';
/** The QR as one SVG path (always dark-on-white with a quiet zone, whatever the theme - scanners need that). */
export function qrNode(text) {
  const qr = makeQr(text), q = 4, n = qr.size + q * 2;
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${n} ${n}`); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', t('qrTitle')); svg.setAttribute('shape-rendering', 'crispEdges');
  const bg = document.createElementNS(NS, 'rect'); bg.setAttribute('width', n); bg.setAttribute('height', n); bg.setAttribute('fill', '#fff');
  let d = ''; for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) if (qr.modules[y][x]) d += `M${x + q} ${y + q}h1v1h-1z`;
  const path = document.createElementNS(NS, 'path'); path.setAttribute('d', d); path.setAttribute('fill', '#000');
  svg.append(bg, path); return svg;
}
export function openQr(text, title = t('qrTitle')) {
  let node; try { node = qrNode(text); } catch { toast(t('qrTooBig')); return null; }
  return modal(title, h('div', { class: 'qr-box' }, node, h('p', { class: 'note' }, t('qrHint'))), [{ label: t('close') }]);
}

/** Starts a scan. In the Android app the result arrives as an 'import' event; in a browser `onText(text)` is called. */
export async function openScanner(onText) {
  if (native.available) { native.scanQr(); return; }
  if (!('BarcodeDetector' in globalThis) || !navigator.mediaDevices?.getUserMedia) { toast(t('scanUnsupported')); return; }
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); } catch { toast(t('scanNoCamera')); return; }
  const video = h('video', { class: 'scan-video', autoplay: true, muted: true, playsInline: true, 'aria-label': t('scanTitle') }); video.srcObject = stream;
  const m = modal(t('scanTitle'), h('div', { class: 'stack' }, video, h('p', { class: 'note' }, t('scanHint'))), [{ label: t('cancel') }]);
  const detector = new globalThis.BarcodeDetector({ formats: ['qr_code'] }); let alive = true;
  const stop = () => { alive = false; stream.getTracks().forEach((tr) => tr.stop()); };
  m.el.addEventListener('close', stop);
  (async () => { while (alive) { try { const codes = await detector.detect(video); if (codes.length) { stop(); m.close(); await onText(codes[0].rawValue); return; } } catch { /* frame not ready */ } await new Promise((r) => setTimeout(r, 250)); } })();
}
