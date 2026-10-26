export const GAP = 0.04;
export function moveBoundary(
  a: number,
  b: number,
  duration: number,
  which: 'a' | 'b',
  value: number
) {
  if (!Number.isFinite(value) || !Number.isFinite(duration) || duration < GAP)
    return { a, b };
  if (which === 'a') a = Math.max(0, Math.min(value, b - GAP));
  else b = Math.min(duration, Math.max(value, a + GAP));
  return { a, b };
}
export function windowAround(
  a: number,
  b: number,
  duration: number,
  zoom: number,
  active: 'a' | 'b'
) {
  if (!Number.isFinite(duration) || duration <= 0) return { lo: 0, hi: 1 };
  if (!zoom) return { lo: 0, hi: duration };
  const whole = b - a >= duration * 0.8;
  const base = whole ? duration / 3 : Math.max(b - a + 1, 2);
  const span = Math.min(duration, Math.max(0.25, base / 2 ** (zoom - 1)));
  const center = zoom > 1 || whole ? (active === 'a' ? a : b) : (a + b) / 2;
  const lo = Math.max(0, Math.min(center - span / 2, duration - span));
  return { lo, hi: lo + span };
}
