import type { Clip, ClipMetadata, StoredClip } from './types.ts';
import { sanitize } from './model.ts';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error('Local library write failed.'));
    transaction.onabort = () =>
      reject(transaction.error || new Error('Local library write failed.'));
  });
}

// Keep the original database name so an existing same-origin library can be upgraded.
export async function openLibrary(demoSource: string) {
  let db: IDBDatabase | null = null;
  let opening: Promise<IDBDatabase> | null = null;
  let closed = false;
  async function connect(): Promise<IDBDatabase> {
    if (closed) throw new Error('The library has been closed.');
    if (db) return db;
    if (opening) return opening;
    opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('loop-study-v1', 2);
      let blocked = false;
      request.onupgradeneeded = () => {
        const connection = request.result;
        if (!connection.objectStoreNames.contains('clips'))
          connection.createObjectStore('clips', { keyPath: 'id' });
        if (!connection.objectStoreNames.contains('settings'))
          connection.createObjectStore('settings');
      };
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
        const connection = request.result;
        if (blocked || closed) {
          connection.close();
          reject(new Error('The library has been closed.'));
          return;
        }
        db = connection;
        connection.onclose = () => {
          if (db === connection) db = null;
        };
        connection.onversionchange = () => {
          connection.close();
          if (db === connection) db = null;
        };
        resolve(connection);
      };
    }).finally(() => {
      opening = null;
    });
    return opening;
  }
  async function transaction(
    names: string | string[],
    mode: IDBTransactionMode = 'readonly'
  ) {
    const connection = await connect();
    try {
      return connection.transaction(names, mode);
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'InvalidStateError')
        throw error;
      connection.close();
      if (db === connection) db = null;
      return (await connect()).transaction(names, mode);
    }
  }
  const urls = new Map<string, string>();
  // Seed inside the same transaction as its marker: deleting all clips stays deleted.
  const seed = await transaction(['clips', 'settings'], 'readwrite');
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
            duration: 14.066667
          }),
          isDemo: true
        });
      }
      settings.put(true, 'initialized');
    };
  };
  await seedDone;

  function present(record: StoredClip): Clip {
    const { blob: legacyBlob, bytes, mediaType, ...metadata } = record;
    const blob = bytes
      ? new Blob([bytes], { type: mediaType || 'video/mp4' })
      : legacyBlob;
    if (blob && !urls.has(record.id))
      urls.set(record.id, URL.createObjectURL(blob));
    return {
      ...sanitize(metadata),
      source: blob
        ? urls.get(record.id)!
        : record.isDemo
          ? demoSource
          : record.source || '',
      isDemo: !!record.isDemo
    };
  }

  return {
    async list() {
      const rows: StoredClip[] = await requestResult(
        (await transaction('clips')).objectStore('clips').getAll()
      );
      return rows.map(present);
    },
    async freshSource(id: string) {
      const record: StoredClip | undefined = await requestResult(
        (await transaction('clips')).objectStore('clips').get(id)
      );
      if (!record)
        throw new Error('This recording is no longer in the local library.');
      if (record.isDemo) return demoSource;
      if (!record.blob && !record.bytes)
        throw new Error(
          'The saved video data could not be read. Keep this entry to preserve its sections.'
        );
      const bytes = record.bytes || (await record.blob!.arrayBuffer());
      if (!bytes.byteLength)
        throw new Error(
          'The saved video is empty. Your library entry and sections are kept.'
        );
      return URL.createObjectURL(
        new Blob([bytes], {
          type: record.mediaType || record.blob?.type || 'video/mp4'
        })
      );
    },
    async save(record: ClipMetadata) {
      const tx = await transaction('clips', 'readwrite');
      const done = completed(tx);
      const clips = tx.objectStore('clips');
      const read = clips.get(record.id);
      read.onsuccess = () => {
        if (read.result) clips.put({ ...read.result, ...sanitize(record) });
      };
      await done;
    },
    async importFiles(files: Iterable<File>) {
      const records = await Promise.all(
        [...files]
          .filter((file) => /\.(mp4|mov|m4v|webm)$/i.test(file.name))
          .map(async (file) => ({
            ...sanitize({
              id: crypto.randomUUID(),
              title: file.name.replace(/\.[^.]+$/, '')
            }),
            bytes: await file.arrayBuffer(),
            mediaType: file.type || 'video/mp4',
            originalName: file.name
          }))
      );
      // One transaction prevents a quota failure from leaving a partially imported batch.
      const tx = await transaction('clips', 'readwrite');
      const done = completed(tx);
      for (const record of records) tx.objectStore('clips').put(record);
      await done;
      return records.map(present);
    },
    async remove(id: string) {
      const tx = await transaction('clips', 'readwrite');
      const done = completed(tx);
      tx.objectStore('clips').delete(id);
      await done;
      const url = urls.get(id);
      if (url) {
        URL.revokeObjectURL(url);
        urls.delete(id);
      }
    },
    close() {
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
      closed = true;
      db?.close();
      db = null;
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

export function rememberClip(id: string) {
  try {
    localStorage.setItem('loop-study-last', id);
  } catch {
    /* IndexedDB remains authoritative. */
  }
}
