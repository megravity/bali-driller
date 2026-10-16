export const speeds = [0.1, 0.25, 0.5, 0.75, 1];
export const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, Number(value) || 0));

export function formatTime(value) {
  const cs = Math.round(Math.max(0, Number(value) || 0) * 100);
  return `${String(Math.floor(cs / 6000)).padStart(2, '0')}:${String(Math.floor(cs / 100) % 60).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
}

export function validSection(a, b, duration) {
  return (
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    a >= 0 &&
    b <= duration + 0.001 &&
    b - a >= 0.04
  );
}

export function sanitize(record) {
  return {
    id: String(record.id),
    title: String(record.title || 'Untitled recording').slice(0, 100),
    creator: String(record.creator || '').slice(0, 80),
    tags: (Array.isArray(record.tags) ? record.tags : [])
      .slice(0, 20)
      .map((tag) => String(tag).slice(0, 40)),
    duration: clamp(record.duration, 0, 86400),
    fps: [24, 30, 60, 120].includes(Number(record.fps))
      ? Number(record.fps)
      : 30,
    speed: speeds.includes(Number(record.speed)) ? Number(record.speed) : 1,
    mirror: !!record.mirror,
    thumbnail:
      typeof record.thumbnail === 'string' &&
      record.thumbnail.startsWith('data:image/') &&
      record.thumbnail.length < 200000
        ? record.thumbnail
        : '',
    sections: (Array.isArray(record.sections) ? record.sections : [])
      .slice(0, 500)
      .filter((section) =>
        validSection(section.a, section.b, Number(record.duration) || 86400)
      )
      .map((section) => ({
        id: String(section.id).slice(0, 80),
        name: String(section.name).slice(0, 80),
        a: section.a,
        b: section.b,
        speed: speeds.includes(section.speed) ? section.speed : 1
      }))
  };
}
