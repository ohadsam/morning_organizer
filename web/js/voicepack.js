// Recorded voice packs (pure): the app's FIXED sentences can be played from short recordings (natural voices made ahead of time), everything else
// (names, times, anything dynamic) falls back to the device voice. This module only knows ids and the manifest; storage and playback live elsewhere.
//
// A pack = { id (voice character), lang, version, clips: { <phraseId>: <file name> } } served as voicepacks/<id>/<lang>/manifest.json + the audio files.
import { cleanText } from './util.js';

/** A short stable id for a spoken text: FNV-1a (32 bit) of "lang|text", base36. The same function runs when the pack is built and when the app looks a sentence up. */
export function phraseId(lang, text) {
  const s = `${lang === 'he' ? 'he' : 'en'}|${String(text ?? '').trim()}`; let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
const FILE = /^[A-Za-z0-9._-]{1,60}\.(opus|ogg|mp3|m4a|aac|wav)$/;
/** Whatever arrives from the network is untrusted: known shape, safe file names, bounded size. -> manifest or null */
export function sanitizeManifest(m) {
  if (!m || typeof m !== 'object') return null;
  const id = cleanText(m.id, 30), lang = m.lang === 'he' ? 'he' : m.lang === 'en' ? 'en' : '', clips = {};
  if (!/^[a-z0-9_-]{1,30}$/.test(id) || !lang || !m.clips || typeof m.clips !== 'object') return null;
  for (const [k, v] of Object.entries(m.clips).slice(0, 5000)) if (/^[a-z0-9]{1,8}$/.test(k) && typeof v === 'string' && FILE.test(v)) clips[k] = v;
  return { id, lang, version: Math.max(0, Math.round(Number(m.version)) || 0), bytes: Math.max(0, Math.round(Number(m.bytes)) || 0), clips };
}
/** The clip file for a sentence, or '' (use the device voice). `text` is the sentence exactly as it is spoken (after cleaning). */
export function clipFor(manifest, lang, text) { if (!manifest || manifest.lang !== (lang === 'he' ? 'he' : 'en')) return ''; const id = phraseId(lang, text); return Object.hasOwn(manifest.clips, id) ? manifest.clips[id] : ''; }
