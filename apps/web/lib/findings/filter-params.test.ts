import { describe, expect, it } from 'vitest';

import { activeFilterCount, parseFindingsQuery, serializeFindingsQuery } from './filter-params';

describe('findings query params', () => {
  it('parses lists, confidence, search and sort', () => {
    const q = parseFindingsQuery(
      new URLSearchParams(
        'pattern=nagging,drip_pricing&severity=high&status=confirmed&engine=code_analysis&stage=stg-payment&confidence=0.7&q=%20fee%20&sort=confidence&dir=desc',
      ),
    );
    expect(q.filter).toEqual({
      patternIds: ['nagging', 'drip_pricing'],
      stageIds: ['stg-payment'],
      severities: ['high'],
      statuses: ['confirmed'],
      engines: ['code_analysis'],
      minConfidence: 0.7,
      search: 'fee',
    });
    expect(q.sort).toBe('confidence');
    expect(q.dir).toBe('desc');
  });

  it('ignores unknown values and defaults the sort', () => {
    const q = parseFindingsQuery(
      new URLSearchParams('pattern=dark_mode&severity=extreme&confidence=7&sort=colour'),
    );
    expect(q.filter).toEqual({});
    expect(q).toMatchObject({ sort: 'severity', dir: 'asc' });
  });

  it('round-trips and keeps links readable', () => {
    const query = parseFindingsQuery(new URLSearchParams('severity=critical,high&q=rider'));
    const text = serializeFindingsQuery(query);
    expect(text).toBe('severity=critical,high&q=rider');
    expect(parseFindingsQuery(new URLSearchParams(text))).toEqual(query);
  });

  it('omits the default sort', () => {
    expect(serializeFindingsQuery({ filter: {}, sort: 'severity', dir: 'asc' })).toBe('');
    expect(serializeFindingsQuery({ filter: {}, sort: 'updated', dir: 'desc' })).toBe(
      'sort=updated&dir=desc',
    );
  });

  it('counts active filters', () => {
    expect(
      activeFilterCount({ severities: ['high', 'low'], search: 'x', minConfidence: 0.5 }),
    ).toBe(4);
    expect(activeFilterCount({})).toBe(0);
  });
});
