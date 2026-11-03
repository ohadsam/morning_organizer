// Voice notes: records the microphone with MediaRecorder (browser and Android WebView). Audio stays on this device.
// The microphone is only open between start() and stop()/cancel(); tracks are always released.
import { MAX_AUDIO_SEC } from './journal.js';

export const recorderSupported = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
const pickMime = () => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((m) => { try { return MediaRecorder.isTypeSupported(m); } catch { return false; } }) || '';

/** -> { stop(): Promise<{blob, sec}>, cancel(), stream } ; rejects (name 'NotAllowedError' etc.) when the mic cannot be opened. */
export async function startRecording({ maxSec = MAX_AUDIO_SEC, onAuto } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = pickMime(), rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined), chunks = [], t0 = Date.now();
  let done = null, cap;
  const release = () => { clearTimeout(cap); stream.getTracks().forEach((x) => x.stop()); };
  rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
  const finished = new Promise((resolve) => { rec.onstop = () => { release(); resolve({ blob: new Blob(chunks, { type: (rec.mimeType || mime || 'audio/webm').split(';')[0] }), sec: Math.min(maxSec, Math.round((Date.now() - t0) / 1000)) }); }; });
  rec.start(1000);
  cap = setTimeout(() => { if (rec.state !== 'inactive') { rec.stop(); onAuto?.(); } }, maxSec * 1000);
  return {
    stream,
    stop: () => { done ??= (rec.state !== 'inactive' ? (rec.stop(), finished) : finished); return done; },
    cancel: () => { chunks.length = 0; rec.onstop = release; if (rec.state !== 'inactive') rec.stop(); else release(); },
  };
}
