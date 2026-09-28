/**
 * Returns a same-origin path to continue to after unlocking, or `/`.
 * Rejects absolute URLs, protocol-relative paths and backslash tricks (open-redirect guard).
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string' || value === '') return '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  if (value === '/access' || value.startsWith('/access?') || value.startsWith('/access/')) {
    return '/';
  }
  // Control characters can be used to smuggle a scheme past browsers' URL parsing.
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return '/';
  }
  return value;
}
