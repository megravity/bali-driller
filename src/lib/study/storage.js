import { sanitize } from './model.js';

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function completed(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () =>
      reject(transaction.error || new Error('Local library write failed.'));
    transaction.onabort = () =>
      reject(transaction.error || new Error('Local library write failed.'));
  });
}

// Keep the original database name so an existing same-origin library can be upgraded.
export async function openLibrary(demoSource) {
  const request = indexedDB.open('loop-study-v1', 2);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains('clips'))
      db.createObjectStore('clips', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('settings'))
      db.createObjectStore('settings');
  };
  const db = await new Promise((resolve, reject) => {
    let blocked = false;
    request.onblocked = () => {
      blocked = true;
      reject(
        new Error(
          'Close older Loop Study tabs, then reload to upgrade the library'
        )
      );
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
  });
  db.onversionchange = () => db.close();
  const urls = new Map();
  // Seed inside the same transaction as its marker: deleting all clips stays deleted.
  const seed = db.transaction(['clips', 'settings'], 'readwrite');
  const seedDone = completed(seed);
  const settings = seed.objectStore('settings');
  const marker = settings.get('initialized');
  marker.onsuccess = () => {
    if (marker.result) return;
    const count = seed.objectStore('clips').count();
    count.onsuccess = () => {
      let legacyInitialized = false;
      try {
        legacyInitialized =
          localStorage.getItem('loop-study-initialized') === '1';
      } catch {
        /* Preferences are optional. */
      }
      if (!count.result && !legacyInitialized) {
        seed.objectStore('clips').put({
          ...sanitize({
            id: 'demo',
            title: 'First motion study',
            tags: ['practice'],
            duration: 21.933333
          }),
          isDemo: true
        });
      }
      settings.put(true, 'initialized');
    };
  };
  await seedDone;

  function present(record) {
    const { blob, ...metadata } = record;
    if (blob && !urls.has(record.id))
      urls.set(record.id, URL.createObjectURL(blob));
    return {
      ...sanitize(metadata),
      source: blob
        ? urls.get(record.id)
        : record.isDemo
          ? demoSource
          : record.source,
      isDemo: !!record.isDemo
    };
  }

  return {
    async list() {
      const rows = await requestResult(
        db.transaction('clips').objectStore('clips').getAll()
      );
      return rows.map(present);
    },
    async save(record) {
      const transaction = db.transaction('clips', 'readwrite');
      const done = completed(transaction);
      const clips = transaction.objectStore('clips');
      const read = clips.get(record.id);
      read.onsuccess = () => {
        if (read.result) clips.put({ ...read.result, ...sanitize(record) });
      };
      await done;
    },
    async importFiles(files) {
      const records = [...files]
        .filter((file) => /\.(mp4|mov|m4v|webm)$/i.test(file.name))
        .map((file) => ({
          ...sanitize({
            id: crypto.randomUUID(),
            title: file.name.replace(/\.[^.]+$/, '')
          }),
          blob: file,
          originalName: file.name
        }));
      // One transaction prevents a quota failure from leaving a partially imported batch.
      const transaction = db.transaction('clips', 'readwrite');
      const done = completed(transaction);
      for (const record of records)
        transaction.objectStore('clips').put(record);
      await done;
      return records.map(present);
    },
    async remove(id) {
      const transaction = db.transaction('clips', 'readwrite');
      const done = completed(transaction);
      transaction.objectStore('clips').delete(id);
      await done;
      if (urls.has(id)) {
        URL.revokeObjectURL(urls.get(id));
        urls.delete(id);
      }
    },
    close() {
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
      db.close();
    }
  };
}

export function readLastClip() {
  try {
    return localStorage.getItem('loop-study-last');
  } catch {
    return null;
  }
}

export function rememberClip(id) {
  try {
    localStorage.setItem('loop-study-last', id);
  } catch {
    /* IndexedDB remains authoritative. */
  }
}
