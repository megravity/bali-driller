import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openLibrary } from '../src/lib/study/storage.js';

function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('loop-study-v1');
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
}

test('video blobs and study metadata survive reopen; deleted demos stay deleted', async () => {
  await deleteDatabase();
  let library = await openLibrary('/project/media/demo.mp4');
  assert.equal((await library.list())[0].source, '/project/media/demo.mp4');
  await library.remove('demo');
  const [clip] = await library.importFiles([
    new File(['movie bytes'], 'Practice.mp4', { type: 'video/mp4' }),
    new File(['text'], 'notes.txt')
  ]);
  assert.equal(clip.title, 'Practice');
  await library.save({
    ...clip,
    title: 'My study',
    duration: 10,
    speed: 0.5,
    mirror: true,
    sections: [{ id: 's', name: 'Opening', a: 1, b: 2, speed: 0.5 }]
  });
  const oldSource = clip.source;
  library.close();
  library = await openLibrary('/project/media/demo.mp4');
  const clips = await library.list();
  assert.equal(clips.length, 1);
  assert.equal(clips[0].title, 'My study');
  assert.equal(clips[0].sections[0].name, 'Opening');
  assert.equal(clips[0].mirror, true);
  assert.notEqual(clips[0].source, oldSource);
  assert.equal(await (await fetch(clips[0].source)).text(), 'movie bytes');
  await library.remove(clip.id);
  await library.save(clip); // A queued save must never resurrect a removed video.
  library.close();
  library = await openLibrary('/project/media/demo.mp4');
  assert.deepEqual(await library.list(), []);
  library.close();
  await deleteDatabase();
});

test('upgrades the original v1 store without replacing its metadata', async () => {
  const request = indexedDB.open('loop-study-v1', 1);
  request.onupgradeneeded = () =>
    request.result.createObjectStore('clips', { keyPath: 'id' });
  const db = await new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result);
  });
  const tx = db.transaction('clips', 'readwrite');
  tx.objectStore('clips').put({
    id: 'demo',
    title: 'Original title',
    isDemo: true,
    source: 'data:video/mp4;base64,old',
    sections: []
  });
  await new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
  db.close();
  const library = await openLibrary('/new-base/media/demo.mp4');
  const [clip] = await library.list();
  assert.equal(clip.title, 'Original title');
  assert.equal(clip.source, '/new-base/media/demo.mp4');
  library.close();
  await deleteDatabase();
});

test('an aborted batch leaves no partially imported videos', async () => {
  const library = await openLibrary('/media/demo.mp4');
  const originalPut = IDBObjectStore.prototype.put;
  let imported = 0;
  IDBObjectStore.prototype.put = function (record, ...args) {
    if (record.blob && ++imported === 2) {
      this.transaction.abort();
      return;
    }
    return originalPut.call(this, record, ...args);
  };
  try {
    await assert.rejects(
      library.importFiles([new File(['a'], 'a.mp4'), new File(['b'], 'b.mp4')])
    );
    assert.deepEqual(
      (await library.list()).map((clip) => clip.id),
      ['demo']
    );
  } finally {
    IDBObjectStore.prototype.put = originalPut;
    library.close();
    await deleteDatabase();
  }
});

test('a blocked database upgrade reports an actionable error', async () => {
  const request = indexedDB.open('loop-study-v1', 1);
  request.onupgradeneeded = () =>
    request.result.createObjectStore('clips', { keyPath: 'id' });
  const oldTab = await new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result);
  });
  await assert.rejects(
    openLibrary('/media/demo.mp4'),
    /Close older Loop Study tabs/
  );
  oldTab.close();
  await deleteDatabase();
});
