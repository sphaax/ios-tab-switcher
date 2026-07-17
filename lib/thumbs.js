// Stockage des miniatures d'onglets dans IndexedDB.
// Partagé entre le service worker (écriture) et la page switcher (lecture).

const DB_NAME = 'ios-tab-switcher';
const DB_VERSION = 1;
const STORE = 'thumbs';

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE, { keyPath: 'tabId' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** @param {{tabId: number, url: string, ts: number, blob: Blob}} record */
export async function putThumb(record) {
  const db = await openDb();
  await promisify(tx(db, 'readwrite').put(record));
}

/** @returns {Promise<Map<number, {tabId: number, url: string, ts: number, blob: Blob}>>} */
export async function getAllThumbs() {
  const db = await openDb();
  const records = await promisify(tx(db, 'readonly').getAll());
  return new Map(records.map((r) => [r.tabId, r]));
}

export async function deleteThumb(tabId) {
  const db = await openDb();
  await promisify(tx(db, 'readwrite').delete(tabId));
}

/** Supprime toutes les entrées dont le tabId n'est pas dans `tabIds`. */
export async function keepOnly(tabIds) {
  const keep = new Set(tabIds);
  const db = await openDb();
  const keys = await promisify(tx(db, 'readonly').getAllKeys());
  const store = tx(db, 'readwrite');
  await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => promisify(store.delete(k))));
}
