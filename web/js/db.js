// IndexedDB wrapper with an in-memory fallback (private mode / blocked storage) so the app still works, just without persistence.
const DB_NAME = 'morning-organizer', DB_VER = 1, STORES = ['templates', 'runs', 'kv'];
let dbp = null, persistent = true;
const mem = Object.fromEntries(STORES.map((s) => [s, new Map()]));

function open() {
  dbp ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('templates')) db.createObjectStore('templates', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('runs')) { const s = db.createObjectStore('runs', { keyPath: 'id' }); s.createIndex('templateId', 'templateId'); }
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = req.onblocked = () => { persistent = false; resolve(null); };
    } catch { persistent = false; resolve(null); }
  });
  return dbp;
}
export const isPersistent = () => persistent;

async function tx(store, mode, fn) {
  const db = await open();
  if (!db) return fn(null, store);
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode), s = t.objectStore(store);
    let result;
    Promise.resolve(fn(s, store)).then((r) => { result = r; }, reject);
    t.oncomplete = () => resolve(result); t.onerror = t.onabort = () => reject(t.error);
  });
}
const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

export const db = {
  all: (store) => tx(store, 'readonly', (s, n) => (s ? wrap(s.getAll()) : [...mem[n].values()])),
  get: (store, key) => tx(store, 'readonly', (s, n) => (s ? wrap(s.get(key)) : mem[n].get(key))),
  put: (store, val, key) => tx(store, 'readwrite', (s, n) => {
    if (!s) { mem[n].set(key ?? val.id, val); return; }
    return wrap(key === undefined ? s.put(val) : s.put(val, key));
  }),
  del: (store, key) => tx(store, 'readwrite', (s, n) => (s ? wrap(s.delete(key)) : mem[n].delete(key))),
  clear: (store) => tx(store, 'readwrite', (s, n) => (s ? wrap(s.clear()) : mem[n].clear())),
};
