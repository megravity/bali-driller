import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTime, validSection, sanitize } from '../src/lib/study/model.ts';

test('time formatting carries rounded centiseconds into minutes', () => {
  assert.equal(formatTime(59.999), '01:00.00');
  assert.equal(formatTime(-1), '00:00.00');
});

test('sections must have finite, ordered bounds inside the recording', () => {
  assert.ok(validSection(1, 2, 3));
  for (const bounds of [
    [2, 1, 3],
    [-1, 2, 3],
    [1, 1.02, 3],
    [1, 4, 3],
    [1, Infinity, 3]
  ]) {
    assert.equal(validSection(bounds[0], bounds[1], bounds[2]), false);
  }
});

test('metadata is bounded and invalid saved sections are removed', () => {
  const record = sanitize({
    id: 'a',
    title: 'x'.repeat(200),
    fps: 99,
    speed: 10,
    thumbnail: 'javascript:bad',
    duration: 3,
    sections: [
      { id: 'valid', name: 'Practice', a: 1, b: 2, speed: 0.5 },
      { id: 'invalid', a: 2, b: 1 }
    ]
  });
  assert.equal(record.title.length, 100);
  assert.equal(record.fps, 30);
  assert.equal(record.speed, 1);
  assert.equal(record.thumbnail, '');
  assert.equal(record.sections.length, 1);
  assert.equal(record.sections[0].speed, 0.5);
});
