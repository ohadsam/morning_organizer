// Sharing the APP itself (not a routine): the Android app (APK link) or the web app (PWA link), by WhatsApp, e-mail, the system share sheet or a copied link.
// Pure: builds the texts and links; the UI opens them.
import { APK_URL, PAGES_URL } from './config.js';

export const KINDS = ['android', 'web'];
const TEXT = {
  he: { android: (u) => `SonRise - אפליקציה שעוזרת לבנות שגרות ולהתמיד בהן. להורדה לאנדרואיד: ${u}`, web: (u) => `SonRise - אפליקציה שעוזרת לבנות שגרות ולהתמיד בהן. אפשר לפתוח בדפדפן ולהתקין (בלי חנות): ${u}`, subject: 'SonRise - אפליקציה לשגרות' },
  en: { android: (u) => `SonRise - an app that helps you build routines and stick to them. Android download: ${u}`, web: (u) => `SonRise - an app that helps you build routines and stick to them. Open it in a browser and install it (no store needed): ${u}`, subject: 'SonRise - an app for routines' },
};
export const urlFor = (kind) => (kind === 'android' ? APK_URL : PAGES_URL);
/** { url, text, subject, whatsapp, mail } for 'android' | 'web'. The links are plain https / mailto URLs (everything is percent-encoded). */
export function shareLinks(kind, lang = 'he') {
  const k = kind === 'android' ? 'android' : 'web', L = TEXT[lang === 'he' ? 'he' : 'en'], url = urlFor(k), text = L[k](url), subject = L.subject;
  return { url, text, subject, whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`, mail: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}` };
}
