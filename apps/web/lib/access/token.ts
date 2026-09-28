/**
 * Access-gate tokens. A token is `v1.<expiry>.<signature>` where the signature is an
 * HMAC-SHA256 of the expiry, keyed by SITE_PASSCODE. Changing the passcode therefore
 * invalidates every issued token. Uses Web Crypto only, so it runs in the proxy and in Node.
 *
 * This is a light gate for sharing a preview link, not user authentication.
 */

export const ACCESS_COOKIE = 'dpat_access';
export const ACCESS_TTL_SECONDS = 7 * 24 * 60 * 60;

const TOKEN_VERSION = 'v1';
const encoder = new TextEncoder();

async function hmac(key: string, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return new Uint8Array(signature);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Constant-time comparison for equal-length byte arrays. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

function signingMessage(expiresAt: number): string {
  return `dpat-access:${TOKEN_VERSION}:${expiresAt}`;
}

/** Compares a submitted passcode with the configured one without leaking timing. */
export async function passcodeMatches(submitted: string, configured: string): Promise<boolean> {
  if (configured === '') return false;
  const [a, b] = await Promise.all([hmac(configured, submitted), hmac(configured, configured)]);
  return timingSafeEqual(a, b);
}

/** Issues a token valid for ACCESS_TTL_SECONDS from `nowSeconds`. */
export async function createAccessToken(
  passcode: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const expiresAt = nowSeconds + ACCESS_TTL_SECONDS;
  const signature = toBase64Url(await hmac(passcode, signingMessage(expiresAt)));
  return `${TOKEN_VERSION}.${expiresAt}.${signature}`;
}

/** True when the token was signed with `passcode` and has not expired. */
export async function verifyAccessToken(
  token: string | undefined,
  passcode: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!token || passcode === '') return false;
  const [version, expiry, signature] = token.split('.');
  if (version !== TOKEN_VERSION || !expiry || !signature || !/^\d+$/.test(expiry)) return false;

  const expiresAt = Number(expiry);
  if (expiresAt <= nowSeconds) return false;

  const expected = toBase64Url(await hmac(passcode, signingMessage(expiresAt)));
  return timingSafeEqual(encoder.encode(signature), encoder.encode(expected));
}
