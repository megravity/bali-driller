import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveBoundary, windowAround } from '../src/lib/study/precision.ts';

test('loop boundaries cannot cross or leave the recording', () => {
  assert.deepEqual(moveBoundary(1, 3, 10, 'a', 5), { a: 2.96, b: 3 });
  assert.deepEqual(moveBoundary(1, 3, 10, 'b', -1), { a: 1, b: 1.04 });
  assert.deepEqual(moveBoundary(1, 3, 10, 'a', -2), { a: 0, b: 3 });
  assert.deepEqual(moveBoundary(1, 3, 10, 'b', 20), { a: 1, b: 10 });
  assert.deepEqual(moveBoundary(1, 3, 10, 'a', NaN), { a: 1, b: 3 });
});
test('zoom windows retain the active endpoint and fit short clips and media edges', () => {
  for (const [a, b, duration] of [
    [0, 0.2, 10],
    [1, 3, 10],
    [9.8, 10, 10],
    [0, 0.1, 0.1]
  ]) {
    for (const active of ['a', 'b'] as const) {
      let previous = duration;
      for (let zoom = 0; zoom <= 10; zoom++) {
        const { lo, hi } = windowAround(a, b, duration, zoom, active);
        assert.ok(lo >= 0 && hi <= duration && hi > lo);
        assert.ok(
          (active === 'a' ? a : b) >= lo && (active === 'a' ? a : b) <= hi
        );
        assert.ok(hi - lo <= previous + 1e-9);
        previous = hi - lo;
      }
    }
  }
  assert.deepEqual(windowAround(0, 30, 30, 1, 'a'), { lo: 0, hi: 10 });
});
