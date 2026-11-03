// Optional journal lock (pure WebCrypto). Design:
//  * Passwords are NEVER stored. A salted PBKDF2-SHA256 hash is kept to verify them (210k iterations, random 16-byte salt).
//  * Entries are encrypted with hybrid crypto: every entry gets its own AES-GCM key, wrapped with the lock's RSA-OAEP PUBLIC key.
//    So a note can be added during a task WITHOUT the password; reading needs the private key.
//  * The RSA private key is stored only encrypted, twice: under a key derived from the password and under a key derived from the
//    answers to the security questions - that second copy is what makes "reset by questions" possible without a server.
//  * Forgetting the password AND the answers means the journal cannot be read - by design. "Erase journal" is the way out.
import { b64u, unb64u } from './share.js';

const subtle = () => globalThis.crypto.subtle, rnd = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));
export const PBKDF2_ITERATIONS = 210_000;
const te = new TextEncoder(), td = new TextDecoder();

/** "  Tel-Aviv! " / "תל אביב" -> "telaviv" / "תלאביב": case, spaces, punctuation and Hebrew niqqud are ignored so answers are forgiving. */
export const normalizeAnswer = (s) => String(s ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

async function pbkdf2Bits(secret, salt, iters, bits = 256) {
  const base = await subtle().importKey('raw', te.encode(secret), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iters }, base, bits));
}
async function aesKeyFrom(secret, salt, iters) {
  return subtle().importKey('raw', await pbkdf2Bits(secret, salt, iters), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
const ctEq = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; };
async function seal(key, bytes) { const iv = rnd(12); return { iv: b64u(iv), ct: b64u(new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, key, bytes))) }; }
async function openSealed(key, o) { return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: unb64u(o.iv) }, key, unb64u(o.ct))); }

export async function hashPassword(password, salt = rnd(16), iters = PBKDF2_ITERATIONS) {
  return { salt: b64u(salt), iters, hash: b64u(await pbkdf2Bits(password, salt, iters)) };
}
export async function verifyPassword(password, rec) {
  try { return ctEq(await pbkdf2Bits(password, unb64u(rec.salt), rec.iters), unb64u(rec.hash)); } catch { return false; }
}

/** questions: [{ q, a }] (>= 2). -> the lock record to store (no secrets inside except hashes / encrypted keys). */
export async function createLock({ password, questions }) {
  if (typeof password !== 'string' || password.length < 4) throw new Error('weak-password');
  const qa = (questions || []).filter((x) => x && x.q && normalizeAnswer(x.a).length >= 2);
  if (qa.length < 2) throw new Error('need-questions');
  const pair = await subtle().generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
  const priv = new Uint8Array(await subtle().exportKey('pkcs8', pair.privateKey)), pub = new Uint8Array(await subtle().exportKey('spki', pair.publicKey));
  const pw = await hashPassword(password), wrapSalt = rnd(16), qSalt = rnd(16);
  return {
    v: 1, pub: b64u(pub), pw, wrapSalt: b64u(wrapSalt), wrapIters: PBKDF2_ITERATIONS, privByPw: await seal(await aesKeyFrom(password, wrapSalt, PBKDF2_ITERATIONS), priv),
    questions: qa.map((x) => String(x.q).slice(0, 120)), qSalt: b64u(qSalt), qIters: PBKDF2_ITERATIONS,
    privByAnswers: await seal(await aesKeyFrom(qa.map((x) => normalizeAnswer(x.a)).join('|'), qSalt, PBKDF2_ITERATIONS), priv),
  };
}
const importPriv = (bytes) => subtle().importKey('pkcs8', bytes, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
/** -> private CryptoKey (kept in memory for the session) or null when the password is wrong. */
export async function openWithPassword(lock, password) {
  if (!(await verifyPassword(password, lock.pw))) return null;
  try { return await importPriv(await openSealed(await aesKeyFrom(password, unb64u(lock.wrapSalt), lock.wrapIters), lock.privByPw)); } catch { return null; }
}
export async function openWithAnswers(lock, answers) {
  try { return await importPriv(await openSealed(await aesKeyFrom(answers.map(normalizeAnswer).join('|'), unb64u(lock.qSalt), lock.qIters), lock.privByAnswers)); } catch { return null; }
}
/** New password for an existing lock (needs the opened private key's raw bytes, so it re-derives them from the old secret). */
export async function changePassword(lock, { oldPassword, answers }, newPassword) {
  if (typeof newPassword !== 'string' || newPassword.length < 4) throw new Error('weak-password');
  let priv;
  try {
    if (oldPassword !== undefined) { if (!(await verifyPassword(oldPassword, lock.pw))) return null; priv = await openSealed(await aesKeyFrom(oldPassword, unb64u(lock.wrapSalt), lock.wrapIters), lock.privByPw); }
    else priv = await openSealed(await aesKeyFrom(answers.map(normalizeAnswer).join('|'), unb64u(lock.qSalt), lock.qIters), lock.privByAnswers);
  } catch { return null; }
  const wrapSalt = rnd(16);
  return { ...lock, pw: await hashPassword(newPassword), wrapSalt: b64u(wrapSalt), wrapIters: PBKDF2_ITERATIONS, privByPw: await seal(await aesKeyFrom(newPassword, wrapSalt, PBKDF2_ITERATIONS), priv) };
}

// ── entries: hybrid encryption (public key to write, private key to read) ──
const pubKey = (lock) => subtle().importKey('spki', unb64u(lock.pub), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
/** bytes -> { k, iv, ct } */
export async function encryptFor(lock, bytes) {
  const key = await subtle().generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']), raw = new Uint8Array(await subtle().exportKey('raw', key));
  const s = await seal(key, bytes);
  return { k: b64u(new Uint8Array(await subtle().encrypt({ name: 'RSA-OAEP' }, await pubKey(lock), raw))), ...s };
}
export async function decryptWith(privKey, enc) {
  const raw = new Uint8Array(await subtle().decrypt({ name: 'RSA-OAEP' }, privKey, unb64u(enc.k)));
  return openSealed(await subtle().importKey('raw', raw, 'AES-GCM', false, ['decrypt']), enc);
}
export const encryptJson = (lock, obj) => encryptFor(lock, te.encode(JSON.stringify(obj)));
export const decryptJson = async (privKey, enc) => JSON.parse(td.decode(await decryptWith(privKey, enc)));

/** Wrong-attempt throttle: free tries, then 30 s, 1 min, 2 min ... capped at 15 min. -> ms to wait before the next try. */
export const waitAfterFails = (fails) => (fails < 3 ? 0 : Math.min(15 * 60_000, 30_000 * 2 ** (fails - 3)));
