import { describe, expect, it } from 'vitest';
import { ACCESS_TTL_SECONDS, createAccessToken, passcodeMatches, verifyAccessToken } from './token';

const PASSCODE = 'correct horse battery staple';
const NOW = 1_800_000_000;

describe('passcodeMatches', () => {
  it('accepts the configured passcode', async () => {
    expect(await passcodeMatches(PASSCODE, PASSCODE)).toBe(true);
  });

  it('rejects a different passcode, including prefixes and case changes', async () => {
    expect(await passcodeMatches('wrong', PASSCODE)).toBe(false);
    expect(await passcodeMatches('correct horse', PASSCODE)).toBe(false);
    expect(await passcodeMatches(PASSCODE.toUpperCase(), PASSCODE)).toBe(false);
  });

  it('rejects everything when no passcode is configured', async () => {
    expect(await passcodeMatches('', '')).toBe(false);
  });
});

describe('access tokens', () => {
  it('verifies a freshly issued token', async () => {
    const token = await createAccessToken(PASSCODE, NOW);
    expect(token).toMatch(/^v1\.\d+\.[A-Za-z0-9_-]+$/);
    expect(await verifyAccessToken(token, PASSCODE, NOW + 60)).toBe(true);
  });

  it('rejects an expired token', async () => {
    const token = await createAccessToken(PASSCODE, NOW);
    expect(await verifyAccessToken(token, PASSCODE, NOW + ACCESS_TTL_SECONDS)).toBe(false);
  });

  it('rejects a token signed with a different passcode (passcode rotation)', async () => {
    const token = await createAccessToken('old passcode', NOW);
    expect(await verifyAccessToken(token, PASSCODE, NOW)).toBe(false);
  });

  it('rejects a token whose expiry was extended', async () => {
    const token = await createAccessToken(PASSCODE, NOW);
    const [version, expiry, signature] = token.split('.');
    const tampered = `${version}.${Number(expiry) + ACCESS_TTL_SECONDS}.${signature}`;
    expect(await verifyAccessToken(tampered, PASSCODE, NOW)).toBe(false);
  });

  it.each([undefined, '', 'garbage', 'v2.1.abc', 'v1.notanumber.abc', 'v1.1900000000'])(
    'rejects malformed token %s',
    async (token) => {
      expect(await verifyAccessToken(token, PASSCODE, NOW)).toBe(false);
    },
  );

  it('rejects every token when no passcode is configured', async () => {
    const token = await createAccessToken(PASSCODE, NOW);
    expect(await verifyAccessToken(token, '', NOW)).toBe(false);
  });
});
