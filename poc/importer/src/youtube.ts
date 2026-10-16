import { Innertube } from 'youtubei.js/cf-worker';
import { HttpError } from './errors.ts';

export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const MAX_METADATA_BYTES = 8 * 1024 * 1024;
const MAX_DURATION = 300;

type Fetch = typeof fetch;
export interface VideoSource {
  videoId: string;
  title: string;
  duration: number;
  contentType: string;
  size: number | null;
  media: Response;
}

// All requests originate from YouTube.js, never from a caller-supplied URL.
// Validate redirects too, so an upstream redirect cannot turn this into a proxy.
export async function restrictedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  transport: Fetch = fetch
): Promise<Response> {
  let request = new Request(input, init);
  for (let hop = 0; hop < 4; hop++) {
    const url = new URL(request.url);
    const allowed =
      url.hostname === 'www.youtube.com' ||
      url.hostname === 'youtube.com' ||
      url.hostname === 'youtubei.googleapis.com' ||
      url.hostname.endsWith('.googlevideo.com');
    if (
      url.protocol !== 'https:' ||
      !allowed ||
      url.port ||
      url.username ||
      url.password
    ) {
      throw new HttpError(
        502,
        'UNSAFE_UPSTREAM',
        'YouTube returned an unsupported media destination.'
      );
    }
    const headers = new Headers(request.headers);
    headers.delete('authorization');
    headers.delete('cookie');
    request = new Request(request, { headers, redirect: 'manual' });
    const response = await transport(request);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      await response.body?.cancel();
      if (!location)
        throw new HttpError(
          502,
          'UPSTREAM_REDIRECT',
          'YouTube returned an invalid redirect.'
        );
      const next = new URL(location, url);
      request = new Request(next, { method: 'GET', signal: request.signal });
      continue;
    }
    const contentType = response.headers.get('Content-Type') || '';
    const limit =
      contentType.startsWith('video/') || contentType.startsWith('audio/')
        ? MAX_MEDIA_BYTES
        : MAX_METADATA_BYTES;
    const contentLength = Number(response.headers.get('Content-Length'));
    if (contentLength > limit) {
      await response.body?.cancel();
      throw new HttpError(
        413,
        'SOURCE_TOO_LARGE',
        'Source exceeds this POC’s size limit. Try a shorter video.'
      );
    }
    if (response.body && limit === MAX_METADATA_BYTES) {
      return new Response(
        boundedStream(response.body, () => {}, limit),
        {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        }
      );
    }
    return response;
  }
  throw new HttpError(
    502,
    'UPSTREAM_REDIRECT',
    'YouTube returned too many redirects.'
  );
}

export async function resolveVideo(
  videoId: string,
  signal: AbortSignal
): Promise<VideoSource> {
  const youtube = await Innertube.create({
    generate_session_locally: true,
    retrieve_innertube_config: false,
    retrieve_player: false,
    enable_session_cache: false,
    fetch: (input, init) => restrictedFetch(input, { ...init, signal })
  });
  const info = await youtube.getBasicInfo(videoId, { client: 'ANDROID' });
  if (info.playability_status?.status !== 'OK') {
    throw new HttpError(
      422,
      'YOUTUBE_UNAVAILABLE',
      info.playability_status?.reason ||
        'YouTube did not allow anonymous playback.'
    );
  }
  const duration = info.basic_info.duration || 0;
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > MAX_DURATION ||
    info.basic_info.is_live ||
    info.basic_info.is_upcoming ||
    info.basic_info.is_private
  ) {
    throw new HttpError(
      422,
      'UNSUPPORTED_VIDEO',
      'This POC accepts public recordings up to five minutes, not live streams.'
    );
  }
  const formats = (info.streaming_data?.formats || [])
    .filter(
      (format) =>
        format.has_audio &&
        format.has_video &&
        format.mime_type.startsWith('video/mp4') &&
        format.url &&
        !format.signature_cipher &&
        !format.cipher &&
        (format.height || 0) <= 720
    )
    .sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0));
  const format = formats[0];
  if (!format?.url)
    throw new HttpError(
      422,
      'NO_DIRECT_MP4',
      'YouTube did not provide a directly downloadable MP4 with audio. This small POC does not decipher player scripts or merge adaptive streams.'
    );
  if (format.content_length && format.content_length > MAX_MEDIA_BYTES)
    throw new HttpError(
      413,
      'SOURCE_TOO_LARGE',
      'Source exceeds the 25 MiB POC limit.'
    );
  const media = await restrictedFetch(format.url, { signal });
  if (!media.ok || !media.body) {
    await media.body?.cancel();
    throw new HttpError(
      502,
      'MEDIA_BLOCKED',
      'YouTube refused the media request.'
    );
  }
  const contentType = media.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().startsWith('video/mp4')) {
    await media.body.cancel();
    throw new HttpError(
      502,
      'INVALID_MEDIA',
      'YouTube did not return MP4 media.'
    );
  }
  const length = Number(media.headers.get('Content-Length'));
  return {
    videoId,
    title: info.basic_info.title || videoId,
    duration,
    contentType,
    size: length > 0 ? length : null,
    media
  };
}

// Pull-based delivery applies backpressure, limits bytes even without Content-Length,
// and cancels the upstream request if the client disconnects or a limit is exceeded.
export function boundedStream(
  source: ReadableStream<Uint8Array>,
  abort: () => void,
  limit = MAX_MEDIA_BYTES
) {
  const reader = source.getReader();
  let bytes = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
          abort();
          return;
        }
        bytes += value.byteLength;
        if (bytes > limit) {
          await reader.cancel();
          throw new Error('Source exceeds the POC byte limit.');
        }
        controller.enqueue(value);
      } catch (error) {
        abort();
        controller.error(error);
      }
    },
    async cancel(reason) {
      abort();
      await reader.cancel(reason);
    }
  });
}
