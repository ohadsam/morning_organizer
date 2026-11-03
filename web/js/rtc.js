// Live link over WebRTC data channels with NO server: no STUN/TURN (iceServers: []) so it works on the same Wi-Fi, and the
// offer/answer ("signaling") travel as encrypted envelopes through any channel the people pick (NFC, share sheet, copy/paste).
export const rtcSupported = () => typeof RTCPeerConnection !== 'undefined';
const ok = (sdp) => typeof sdp === 'string' && sdp.length > 20 && sdp.length <= 8000 && sdp.startsWith('v=0');

function iceDone(pc, ms = 3000) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const done = () => { pc.removeEventListener('icegatheringstatechange', chk); resolve(); };
    const chk = () => { if (pc.iceGatheringState === 'complete') done(); };
    pc.addEventListener('icegatheringstatechange', chk); setTimeout(done, ms);
  });
}
const newPc = () => new RTCPeerConnection({ iceServers: [] });

/** Wraps a data channel: resolves `opened` when usable; `onmessage(text)` / `onclose()` hooks. */
function wrap(dc, hooks) {
  const opened = new Promise((res) => { if (dc.readyState === 'open') res(); else dc.addEventListener('open', () => res(), { once: true }); });
  dc.addEventListener('message', (e) => { if (typeof e.data === 'string' && e.data.length <= 300_000) hooks.onmessage?.(e.data); });
  dc.addEventListener('close', () => hooks.onclose?.());
  return { opened, send: (text) => { if (dc.readyState !== 'open') return false; dc.send(text); return true; }, close: () => { try { dc.close(); } catch { /* closed */ } }, get open() { return dc.readyState === 'open'; } };
}

/** Offerer (parent). -> { sdp, accept(answerSdp), channel } where `channel` is wrapped once the answer is applied. */
export async function createOffer(hooks = {}) {
  const pc = newPc(), dc = pc.createDataChannel('ml');
  await pc.setLocalDescription(await pc.createOffer()); await iceDone(pc);
  const channel = wrap(dc, hooks);
  return { sdp: pc.localDescription.sdp, channel, close: () => { channel.close(); pc.close(); },
    accept: async (answerSdp) => { if (!ok(answerSdp)) throw new Error('bad-sdp'); await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp }); } };
}
/** Answerer (child). -> { sdp, channel: Promise<wrapped> } */
export async function createAnswer(offerSdp, hooks = {}) {
  if (!ok(offerSdp)) throw new Error('bad-sdp');
  const pc = newPc();
  const channel = new Promise((res) => { pc.addEventListener('datachannel', (e) => res(wrap(e.channel, hooks)), { once: true }); });
  await pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
  await pc.setLocalDescription(await pc.createAnswer()); await iceDone(pc);
  return { sdp: pc.localDescription.sdp, channel, close: () => pc.close() };
}
