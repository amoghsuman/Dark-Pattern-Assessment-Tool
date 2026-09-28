import { describe, expect, it } from 'vitest';

import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatPercent,
  formatRelative,
  initials,
  toKey,
} from './format';

describe('format helpers', () => {
  it('renders dates in IST', () => {
    // 20:00 UTC on 3 Aug is 1:30 am on 4 Aug in IST.
    expect(formatDate('2026-08-03T20:00:00Z')).toMatch(/4 Aug/);
    expect(formatDateTime('2026-08-03T20:00:00Z')).toMatch(/1:30.*IST$/i);
  });

  it('formats relative times and falls back to dates', () => {
    const now = new Date('2026-09-29T06:00:00Z');
    expect(formatRelative('2026-09-29T05:59:30Z', now)).toBe('just now');
    expect(formatRelative('2026-09-29T04:00:00Z', now)).toBe('2 hours ago');
    expect(formatRelative('2026-09-26T06:00:00Z', now)).toBe('3 days ago');
    expect(formatRelative('2026-06-01T06:00:00Z', now)).toMatch(/Jun/);
    expect(formatRelative('2026-09-30T06:00:00Z', now)).toMatch(/30 Sep/);
  });

  it('formats numbers', () => {
    expect(formatPercent(0.284)).toBe('28%');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(48_213_504)).toBe('46 MB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('derives initials and keys', () => {
    expect(initials('Priya Raman')).toBe('PR');
    expect(initials('  kavya  ')).toBe('K');
    expect(toKey('Quote and Comparison')).toBe('quote_and_comparison');
    expect(toKey('2FA prompts')).toBe('stage_2fa_prompts');
  });
});
