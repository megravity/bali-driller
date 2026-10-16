import { authorize } from './auth.ts';
import { HttpError } from './errors.ts';
import { readInput } from './validation.ts';
import { boundedStream, resolveVideo } from './youtube.ts';

const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; media-src 'self' blob:; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
};
function secure(response: Response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders))
    headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
export type ImporterEnv = Pick<
  Env,
  'ACCESS_ISSUER' | 'ACCESS_AUD' | 'ALLOWED_EMAILS' | 'LOCAL_DEV'
> & {
  IMPORT_LIMITER: Pick<Env['IMPORT_LIMITER'], 'limit'>;
  ASSETS: { fetch(request: Request): Promise<Response> };
};
export function createImporter(
  retrieve = resolveVideo,
  authenticate = authorize
) {
  return {
    async fetch(request: Request, env: ImporterEnv): Promise<Response> {
      const requestId = crypto.randomUUID();
      try {
        const identity = await authenticate(request, env);
        const url = new URL(request.url);
        if (url.pathname === '/api/status' && request.method === 'GET') {
          return secure(
            Response.json({
              mode: identity === 'local-developer' ? 'local' : 'access',
              maxBytes: 25 * 1024 * 1024,
              maxDuration: 300
            })
          );
        }
        if (url.pathname === '/api/media' && request.method === 'POST') {
          const origin = request.headers.get('Origin');
          if (origin && origin !== url.origin)
            throw new HttpError(
              403,
              'WRONG_ORIGIN',
              'Open the importer directly to use it.'
            );
          if (!(await env.IMPORT_LIMITER.limit({ key: identity })).success)
            throw new HttpError(
              429,
              'RATE_LIMITED',
              'Please wait a minute before trying another recording.'
            );
          const videoId = await readInput(request);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 60000);
          const disconnect = () => controller.abort();
          request.signal.addEventListener('abort', disconnect, { once: true });
          const cleanup = () => {
            clearTimeout(timeout);
            request.signal.removeEventListener('abort', disconnect);
            controller.abort();
          };
          try {
            const source = await retrieve(videoId, controller.signal);
            const body = boundedStream(source.media.body!, cleanup);
            return secure(
              new Response(body, {
                headers: {
                  'Content-Type': 'video/mp4',
                  'Content-Disposition': `attachment; filename="youtube-${videoId}.mp4"`,
                  'X-Video-Title': encodeURIComponent(
                    source.title.slice(0, 200)
                  ),
                  'X-Video-Duration': String(source.duration)
                }
              })
            );
          } catch (error) {
            cleanup();
            throw error;
          }
        }
        if (url.pathname.startsWith('/api/'))
          throw new HttpError(404, 'NOT_FOUND', 'Unknown importer endpoint.');
        if (request.method !== 'GET' && request.method !== 'HEAD')
          throw new HttpError(
            405,
            'METHOD_NOT_ALLOWED',
            'Use GET for the importer page.'
          );
        return secure(await env.ASSETS.fetch(request));
      } catch (error) {
        const known = error instanceof HttpError;
        const code = known ? error.code : 'RETRIEVAL_FAILED';
        // Never log upstream URLs, tokens, email addresses, or library error payloads.
        console.warn(JSON.stringify({ requestId, code }));
        return secure(
          Response.json(
            {
              error: {
                code,
                message: known
                  ? error.message
                  : 'YouTube retrieval failed. The service may require a player signature, verification, or a different runtime. No clip was imported.',
                requestId
              }
            },
            { status: known ? error.status : 502 }
          )
        );
      }
    }
  } satisfies ExportedHandler<Env>;
}
export default createImporter();
