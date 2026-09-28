import { describe, expect, it } from 'vitest';
import { parseDataSource } from './data-source';

describe('parseDataSource', () => {
  it('defaults to sample when unset or blank', () => {
    expect(parseDataSource(undefined)).toBe('sample');
    expect(parseDataSource('  ')).toBe('sample');
  });

  it('accepts sample in any case', () => {
    expect(parseDataSource('SAMPLE')).toBe('sample');
  });

  it('rejects unknown sources', () => {
    expect(() => parseDataSource('postgres')).toThrow(/Invalid DATA_SOURCE/);
  });
});
