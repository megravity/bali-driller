export {};

const form = document.querySelector<HTMLFormElement>('#import-form')!;
const input = document.querySelector<HTMLInputElement>('#youtube-url')!;
const retrieve = document.querySelector<HTMLButtonElement>('#retrieve')!;
const cancel = document.querySelector<HTMLButtonElement>('#cancel')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const activity = document.querySelector<HTMLDivElement>('.activity')!;
const result = document.querySelector<HTMLElement>('#result')!;
const preview = document.querySelector<HTMLVideoElement>('#preview')!;
const download = document.querySelector<HTMLAnchorElement>('#download')!;
let controller: AbortController | undefined;
let objectUrl: string | undefined;
function message(text: string, state = '') {
  status.textContent = text;
  activity.className = `activity ${state}`;
}
function releaseMedia() {
  preview.pause();
  preview.removeAttribute('src');
  preview.load();
  download.removeAttribute('href');
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = undefined;
  result.hidden = true;
}
try {
  const response = await fetch('/api/status');
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error?.message || 'Access check failed.');
  document.querySelector<HTMLElement>('#mode')!.textContent =
    data.mode === 'local'
      ? 'Local development · Cloudflare Access is bypassed on loopback only.'
      : 'Cloudflare Access session verified · Private importer';
  retrieve.disabled = false;
} catch (error) {
  message(
    error instanceof Error ? error.message : 'Access check failed.',
    'error'
  );
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  releaseMedia();
  const attempt = new AbortController();
  controller = attempt;
  retrieve.disabled = true;
  input.disabled = true;
  cancel.hidden = false;
  message('Asking YouTube for a playable source…', 'busy');
  try {
    const response = await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video: input.value }),
      signal: attempt.signal
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `${data.error?.message || 'Retrieval failed.'} (${data.error?.code || response.status})`
      );
    }
    if (!response.body) throw new Error('No media stream was received.');
    const reader = response.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 25 * 1024 * 1024) {
        attempt.abort();
        throw new Error('Source exceeded the 25 MiB limit.');
      }
      chunks.push(value);
      message(
        `Receiving recording… ${(bytes / 1024 / 1024).toFixed(1)} MiB`,
        'busy'
      );
    }
    if (!bytes) throw new Error('YouTube returned an empty recording.');
    objectUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
    document.querySelector<HTMLElement>('#video-title')!.textContent =
      decodeURIComponent(
        response.headers.get('X-Video-Title') || 'Retrieved recording'
      );
    document.querySelector<HTMLElement>('#size')!.textContent =
      `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
    const decoded = new Promise<void>((resolve, reject) => {
      const complete = (error?: Error) => {
        clearTimeout(timer);
        preview.onloadeddata = null;
        preview.onerror = null;
        attempt.signal.removeEventListener('abort', onAbort);
        if (error) reject(error);
        else resolve();
      };
      const onAbort = () =>
        complete(new DOMException('Cancelled', 'AbortError'));
      const timer = setTimeout(
        () =>
          complete(
            new Error('The recording could not be decoded within 15 seconds.')
          ),
        15000
      );
      preview.onloadeddata = () => complete();
      preview.onerror = () =>
        complete(
          new Error('Bytes were received, but this browser cannot play them.')
        );
      attempt.signal.addEventListener('abort', onAbort, { once: true });
      if (attempt.signal.aborted) onAbort();
    });
    preview.src = objectUrl;
    preview.load();
    await decoded;
    download.href = objectUrl;
    download.download = 'youtube-recording.mp4';
    result.hidden = false;
    message(
      `Retrieved and decoded ${preview.videoWidth} × ${preview.videoHeight} video. Press play to check audio and motion.`
    );
  } catch (error) {
    releaseMedia();
    const cancelled = error instanceof Error && error.name === 'AbortError';
    message(
      cancelled
        ? 'Retrieval cancelled. Nothing was imported.'
        : error instanceof Error
          ? error.message
          : 'Retrieval failed.',
      cancelled ? '' : 'error'
    );
  } finally {
    controller = undefined;
    retrieve.disabled = false;
    input.disabled = false;
    cancel.hidden = true;
  }
});
cancel.addEventListener('click', () => controller?.abort());
window.addEventListener('pagehide', () => {
  controller?.abort();
  releaseMedia();
});
