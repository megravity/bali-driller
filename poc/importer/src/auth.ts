import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { HttpError } from './errors.ts';

type AccessConfig = Pick<
  Env,
  'ACCESS_ISSUER' | 'ACCESS_AUD' | 'ALLOWED_EMAILS' | 'LOCAL_DEV'
>;

export async function verifyAssertion(
  token: string,
  issuer: string,
  audience: string,
  keys?: JWTVerifyGetKey
) {
  const jwks =
    keys ??
    createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuer), {
      timeoutDuration: 5000
    });
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience,
    algorithms: ['RS256'],
    requiredClaims: ['exp', 'iat', 'sub', 'email']
  });
  if (typeof payload.email !== 'string') throw new Error('Missing email claim');
  return payload.email.toLowerCase();
}

export async function authorize(
  request: Request,
  env: AccessConfig
): Promise<string> {
  const url = new URL(request.url);
  // This exception is explicit, loopback-only, and disabled in deployment config.
  if (
    env.LOCAL_DEV === 'true' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  )
    return 'local-developer';
  if (
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER) ||
    !env.ACCESS_AUD
  ) {
    throw new HttpError(
      503,
      'ACCESS_NOT_CONFIGURED',
      'Private importer is locked. Configure Cloudflare Access first.'
    );
  }
  const assertion = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!assertion)
    throw new HttpError(
      401,
      'SIGN_IN_REQUIRED',
      'Sign in through Cloudflare Access to use the importer.'
    );
  let email: string;
  try {
    email = await verifyAssertion(assertion, env.ACCESS_ISSUER, env.ACCESS_AUD);
  } catch {
    throw new HttpError(
      401,
      'INVALID_SESSION',
      'Your Access session could not be verified. Sign in again.'
    );
  }
  const allowed = env.ALLOWED_EMAILS.split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.includes(email))
    throw new HttpError(
      403,
      'NOT_ALLOWED',
      'This account is not allowed to use the private importer.'
    );
  return email;
}
