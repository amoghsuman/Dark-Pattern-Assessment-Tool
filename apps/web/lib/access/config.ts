/**
 * Reads SITE_PASSCODE at request time. Kept free of `server-only` so the proxy can import it.
 * An unset or blank passcode means the gate is not configured and every request is blocked.
 */
export function getSitePasscode(): string {
  return process.env.SITE_PASSCODE?.trim() ?? '';
}
