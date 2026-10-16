import { HttpError } from './errors.ts';

export function parseVideoId(value: unknown): string {
  if (typeof value !== 'string')
    throw new HttpError(
      400,
      'INVALID_VIDEO',
      'Paste a YouTube link or video ID.'
    );
  const input = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new HttpError(400, 'INVALID_VIDEO', 'Enter a valid YouTube URL.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.searchParams.has('list')
  ) {
    throw new HttpError(
      400,
      'INVALID_VIDEO',
      'Use a public HTTPS video link without a playlist.'
    );
  }
  let id: string | null = null;
  if (url.hostname === 'youtu.be') id = url.pathname.split('/')[1];
  else if (
    ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)
  ) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else if (/^\/(shorts|embed)\//.test(url.pathname))
      id = url.pathname.split('/')[2];
  }
  if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id))
    throw new HttpError(
      400,
      'INVALID_VIDEO',
      'Only YouTube video links are supported.'
    );
  return id;
}

export async function readInput(request: Request): Promise<string> {
  if (
    !request.headers
      .get('Content-Type')
      ?.toLowerCase()
      .startsWith('application/json')
  ) {
    throw new HttpError(415, 'EXPECTED_JSON', 'Use application/json.');
  }
  const reader = request.body?.getReader();
  if (!reader)
    throw new HttpError(400, 'INVALID_BODY', 'A video link is required.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2048) {
      await reader.cancel();
      throw new HttpError(413, 'INPUT_TOO_LARGE', 'Request body is too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, 'INVALID_BODY', 'Invalid JSON.');
  }
  if (typeof input !== 'object' || input === null || !('video' in input))
    throw new HttpError(400, 'INVALID_BODY', 'A video link is required.');
  return parseVideoId(input.video);
}
