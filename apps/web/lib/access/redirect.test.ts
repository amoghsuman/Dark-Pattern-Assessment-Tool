import { describe, expect, it } from 'vitest';
import { safeNextPath } from './redirect';

describe('safeNextPath', () => {
  it.each([
    ['/', '/'],
    ['/assessments/abc/findings?severity=high', '/assessments/abc/findings?severity=high'],
    ['/rules/false_urgency#criteria', '/rules/false_urgency#criteria'],
  ])('keeps same-origin path %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    [undefined],
    [null],
    [42],
    [''],
    ['https://attacker.example'],
    ['//attacker.example'],
    ['/\\attacker.example'],
    ['javascript:alert(1)'],
    ['/access'],
    ['/access?next=/'],
    ['/\tattacker'],
  ])('falls back to / for %s', (input) => {
    expect(safeNextPath(input)).toBe('/');
  });
});
