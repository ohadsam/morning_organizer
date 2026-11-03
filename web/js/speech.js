// Read-aloud with the device's own text-to-speech (Web Speech API; works in browsers and the Android WebView). Nothing leaves the device.
// "Characters" are pitch/speed effects applied to a real device voice - honest, and no copyrighted voices.
export const PRESETS = {
  natural: { pitch: 1, rate: 1, emoji: '🙂' }, deep: { pitch: 0.7, rate: 0.95, emoji: '🧔' }, high: { pitch: 1.3, rate: 1.05, emoji: '👩' },
  robot: { pitch: 0.1, rate: 0.85, emoji: '🤖' }, chipmunk: { pitch: 2, rate: 1.3, emoji: '🐿️' }, giant: { pitch: 0, rate: 0.7, emoji: '🦖' },
  sleepy: { pitch: 0.6, rate: 0.6, emoji: '🥱' }, hero: { pitch: 0.5, rate: 0.9, emoji: '🦸' }, fairy: { pitch: 1.9, rate: 1, emoji: '🧚' },
};
export const ttsSupported = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
const bcp = (lang) => (lang === 'he' ? 'he-IL' : 'en-US');
const langMatch = (v, lang) => v.lang?.toLowerCase().replace('_', '-').startsWith(lang === 'he' ? 'he' : 'en') || (lang === 'he' && /^iw/i.test(v.lang || ''));

/** Voices installed for the language. Voices load asynchronously in most browsers, so wait briefly. */
export function voicesFor(lang) {
  if (!ttsSupported()) return Promise.resolve([]);
  const read = () => speechSynthesis.getVoices().filter((v) => langMatch(v, lang));
  const now = read(); if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => { speechSynthesis.removeEventListener?.('voiceschanged', done); resolve(read()); };
    speechSynthesis.addEventListener?.('voiceschanged', done); setTimeout(done, 1200);
  });
}

export function stopSpeaking() { try { speechSynthesis.cancel(); } catch { /* no TTS */ } }

/** Speak `text`. opts: { lang, voiceURI, preset }. Returns false when speech is unavailable. */
export function speakText(text, { lang = 'en', voiceURI = '', preset = 'natural' } = {}) {
  if (!ttsSupported() || !text) return false;
  try {
    stopSpeaking();
    const u = new SpeechSynthesisUtterance(String(text).replace(/\p{Extended_Pictographic}|️/gu, '').slice(0, 600));
    const p = PRESETS[preset] ?? PRESETS.natural;
    u.lang = bcp(lang); u.pitch = p.pitch; u.rate = p.rate;
    const voice = speechSynthesis.getVoices().find((v) => (voiceURI && v.voiceURI === voiceURI) || (!voiceURI && langMatch(v, lang)));
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}
