import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { authorize, verifyAssertion } from '../src/auth.ts';
import { parseVideoId, readInput } from '../src/validation.ts';
import { boundedStream, restrictedFetch } from '../src/youtube.ts';
import { createImporter, type ImporterEnv } from '../src/index.ts';

const config = {
  ACCESS_ISSUER: 'https://example.cloudflareaccess.com',
  ACCESS_AUD: 'importer-audience',
  ALLOWED_EMAILS: 'marvin.deutz@gmail.com',
  LOCAL_DEV: 'false'
};
const settings: ImporterEnv = {
  ...config,
  IMPORT_LIMITER: { limit: async () => ({ success: true }) },
  ASSETS: { fetch: async () => new Response('private page') }
};

test('only public YouTube link shapes and IDs are accepted', () => {
  for (const value of [
    'jNQXAC9IVRw',
    'https://youtu.be/jNQXAC9IVRw?t=3',
    'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    'https://youtube.com/shorts/jNQXAC9IVRw',
    'https://youtube.com/embed/jNQXAC9IVRw'
  ])
    assert.equal(parseVideoId(value), 'jNQXAC9IVRw');
  for (const value of [
    'https://evil.test/watch?v=jNQXAC9IVRw',
    'http://127.0.0.1/',
    'https://youtube.com.evil.test/watch?v=jNQXAC9IVRw',
    'https://youtube.com/watch?v=jNQXAC9IVRw&list=playlist',
    'https://user:pass@youtube.com/watch?v=jNQXAC9IVRw',
    null
  ])
    assert.throws(() => parseVideoId(value));
});

test('JSON inputs are bounded and malformed input is rejected', async () => {
  const request = (body: string) =>
    new Request('https://import.example/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
  assert.equal(
    await readInput(request(JSON.stringify({ video: 'jNQXAC9IVRw' }))),
    'jNQXAC9IVRw'
  );
  await assert.rejects(readInput(request('invalid')));
  await assert.rejects(
    readInput(request(JSON.stringify({ video: 'x'.repeat(3000) })))
  );
});

test('Access is fail-closed and local bypass cannot authorize a remote hostname', async () => {
  await assert.rejects(
    authorize(new Request('https://import.example/'), {
      ...config,
      ACCESS_AUD: ''
    }),
    /locked/
  );
  await assert.rejects(
    authorize(new Request('https://import.example/'), config),
    /Sign in/
  );
  await assert.rejects(
    authorize(new Request('https://import.example/'), {
      ...config,
      LOCAL_DEV: 'true'
    }),
    /Sign in/
  );
  assert.equal(
    await authorize(new Request('http://127.0.0.1:8787/'), {
      ...config,
      LOCAL_DEV: 'true'
    }),
    'local-developer'
  );
  await assert.rejects(
    authorize(new Request('http://127.0.0.1:8787/'), config),
    /Sign in/
  );
  await assert.rejects(
    authorize(
      new Request('https://import.example/', {
        headers: { 'Cf-Access-Jwt-Assertion': 'forged.jwt.token' }
      }),
      config
    ),
    /verified/
  );
});

test('Access verification requires signature, issuer, audience, and an unexpired token', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const key = await exportJWK(publicKey);
  const keys = createLocalJWKSet({
    keys: [{ ...key, kid: 'test', alg: 'RS256' }]
  });
  const token = (audience = config.ACCESS_AUD, expires = '5m') =>
    new SignJWT({ email: 'marvin.deutz@gmail.com' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer(config.ACCESS_ISSUER)
      .setAudience(audience)
      .setSubject('user')
      .setIssuedAt()
      .setExpirationTime(expires)
      .sign(privateKey);
  assert.equal(
    await verifyAssertion(
      await token(),
      config.ACCESS_ISSUER,
      config.ACCESS_AUD,
      keys
    ),
    'marvin.deutz@gmail.com'
  );
  await assert.rejects(
    verifyAssertion(
      await token('another-app'),
      config.ACCESS_ISSUER,
      config.ACCESS_AUD,
      keys
    )
  );
  await assert.rejects(
    verifyAssertion(
      await token(),
      'https://wrong.cloudflareaccess.com',
      config.ACCESS_AUD,
      keys
    )
  );
  await assert.rejects(
    verifyAssertion(
      await token(config.ACCESS_AUD, '-1m'),
      config.ACCESS_ISSUER,
      config.ACCESS_AUD,
      keys
    )
  );
});

test('unauthenticated requests never reach assets, the limiter, or YouTube', async () => {
  let touched = false;
  const importer = createImporter(async () => {
    touched = true;
    throw new Error('unreachable');
  });
  const response = await importer.fetch(
    new Request('https://import.example/api/media', { method: 'POST' }),
    {
      ...settings,
      IMPORT_LIMITER: {
        limit: async () => {
          touched = true;
          return { success: true };
        }
      },
      ASSETS: {
        fetch: async () => {
          touched = true;
          return new Response('private');
        }
      }
    }
  );
  assert.equal(response.status, 401);
  assert.equal(touched, false);
  assert.equal(
    (await importer.fetch(new Request('https://import.example/'), settings))
      .status,
    401
  );
});

test('wrong origins and rate-limited requests never retrieve media', async () => {
  const importer = createImporter(
    async () => {
      throw new Error('unreachable');
    },
    async () => 'approved-user'
  );
  const request = (origin?: string) =>
    new Request('https://import.example/api/media', {
      method: 'POST',
      headers: origin ? { Origin: origin } : {}
    });
  assert.equal(
    (await importer.fetch(request('https://evil.test'), settings)).status,
    403
  );
  assert.equal(
    (
      await importer.fetch(request(), {
        ...settings,
        IMPORT_LIMITER: { limit: async () => ({ success: false }) }
      })
    ).status,
    429
  );
});

test('media and metadata streams enforce byte limits and propagate cancellation', async () => {
  let cancelled = false,
    cleaned = false;
  const source = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new Uint8Array(8));
      c.enqueue(new Uint8Array(8));
    },
    cancel() {
      cancelled = true;
    }
  });
  const reader = boundedStream(
    source,
    () => {
      cleaned = true;
    },
    10
  ).getReader();
  assert.equal((await reader.read()).value?.length, 8);
  await assert.rejects(reader.read());
  assert.equal(cancelled, true);
  assert.equal(cleaned, true);
  let stop = false;
  await boundedStream(
    new ReadableStream({
      cancel() {
        stop = true;
      }
    }),
    () => {}
  ).cancel();
  assert.equal(stop, true);
});

test('upstream redirects cannot become an arbitrary URL proxy', async () => {
  let fetched = 0;
  const transport: typeof fetch = async () => {
    fetched++;
    return new Response(null, {
      status: 302,
      headers: { Location: 'http://127.0.0.1/private' }
    });
  };
  await assert.rejects(
    restrictedFetch('https://www.youtube.com/iframe_api', undefined, transport),
    /unsupported media destination/
  );
  assert.equal(fetched, 1);
  await assert.rejects(
    restrictedFetch('https://evil-googlevideo.com/video', undefined, transport)
  );
});

test('a successful source streams an MP4 and sets private response headers', async () => {
  const importer = createImporter(
    async (videoId) => ({
      videoId,
      title: 'Example',
      duration: 10,
      size: 3,
      contentType: 'video/mp4',
      media: new Response(new Uint8Array([1, 2, 3]))
    }),
    async () => 'approved-user'
  );
  const response = await importer.fetch(
    new Request('https://import.example/api/media', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://import.example'
      },
      body: JSON.stringify({ video: 'jNQXAC9IVRw' })
    }),
    settings
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Content-Type'), 'video/mp4');
  assert.deepEqual(
    [...new Uint8Array(await response.arrayBuffer())],
    [1, 2, 3]
  );
});
