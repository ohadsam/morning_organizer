// Live Bluetooth transport (native app). WebRTC lives in rtc.js; manual codes need no transport at all.
import { native, onNativeEvent } from './native.js';
import * as F from './family.js';

let state = 'idle', peer = '', open = false;
const subs = new Set();
const emit = () => subs.forEach((f) => f());
export const subscribeBt = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const btState = () => ({ state, peer, open });
export const btAvailable = () => native.available && native.btStatus() !== 'none';

export const btChannel = { kind: 'bt', get open() { return open; }, send: (text) => native.btSend(text) };

export function initTransports(onResult) {
  onNativeEvent((ev) => {
    if (ev?.type !== 'bt') return;
    if (ev.state === 'listening') state = 'listening';
    else if (ev.state === 'connected') {
      state = 'connected'; peer = String(ev.peer || ''); open = true;
      for (const l of F.childLinks()) F.setLive(l.id, btChannel); // the child announces itself with a report on every link it has
    } else if (ev.state === 'disconnected') { state = 'idle'; open = false; for (const l of F.getFamily().links) if (F.getFamily().live.get(l.id) === btChannel) F.dropLive(l.id); }
    else if (ev.state === 'error') { state = `error:${ev.reason || ''}`; open = false; }
    else if (ev.state === 'data') F.receive(String(ev.data || ''), btChannel).then((r) => onResult?.(r)).catch(() => {});
    emit();
  });
}
