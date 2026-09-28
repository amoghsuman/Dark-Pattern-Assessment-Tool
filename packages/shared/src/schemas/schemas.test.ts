import { describe, expect, it } from 'vitest';

import { JourneyStepSchema, TargetSchema } from './assessment';
import { BoundingBoxSchema, EvidenceSchema } from './finding';

describe('TargetSchema', () => {
  it('discriminates by type', () => {
    const target = TargetSchema.parse({
      id: 't1',
      assessmentId: 'a1',
      type: 'mobile_app',
      name: 'Android app',
      platform: 'android',
      appId: 'com.examplelife.app',
      version: '4.2.0',
      environment: 'production',
    });
    expect(target.type).toBe('mobile_app');
  });

  it('rejects a website without a valid URL', () => {
    const result = TargetSchema.safeParse({
      id: 't1',
      assessmentId: 'a1',
      type: 'website',
      name: 'Site',
      baseUrl: 'not a url',
      environment: 'production',
    });
    expect(result.success).toBe(false);
  });
});

describe('JourneyStepSchema', () => {
  const base = { id: 's1', order: 0, stageId: 'st1', label: 'Step' };

  it('requires a target for navigate, click and fill', () => {
    expect(JourneyStepSchema.safeParse({ ...base, action: 'click' }).success).toBe(false);
    expect(
      JourneyStepSchema.safeParse({ ...base, action: 'click', target: 'button#buy' }).success,
    ).toBe(true);
  });

  it('requires a value for fill and a duration for wait', () => {
    expect(JourneyStepSchema.safeParse({ ...base, action: 'fill', target: '#age' }).success).toBe(
      false,
    );
    expect(JourneyStepSchema.safeParse({ ...base, action: 'wait' }).success).toBe(false);
    expect(JourneyStepSchema.safeParse({ ...base, action: 'wait', waitMs: 500 }).success).toBe(
      true,
    );
  });

  it('allows capture without a target', () => {
    expect(JourneyStepSchema.safeParse({ ...base, action: 'capture' }).success).toBe(true);
  });
});

describe('BoundingBoxSchema', () => {
  it('accepts boxes inside the image', () => {
    expect(
      BoundingBoxSchema.safeParse({ x: 0.1, y: 0.2, width: 0.5, height: 0.3, label: 'Timer' })
        .success,
    ).toBe(true);
  });

  it('rejects boxes that extend past the image', () => {
    expect(
      BoundingBoxSchema.safeParse({ x: 0.8, y: 0.2, width: 0.5, height: 0.3, label: 'Timer' })
        .success,
    ).toBe(false);
  });
});

describe('EvidenceSchema', () => {
  const snippet = {
    id: 'e1',
    kind: 'code_snippet' as const,
    filePath: 'src/quote/QuoteTimer.tsx',
    language: 'tsx' as const,
    startLine: 10,
    endLine: 12,
    highlightLines: [11],
    code: 'const a = 1;\nconst b = 2;\nconst c = 3;',
    caption: 'Timer resets on mount',
  };

  it('accepts a snippet whose line count matches its range', () => {
    expect(EvidenceSchema.safeParse(snippet).success).toBe(true);
  });

  it('rejects a snippet whose line count does not match its range', () => {
    expect(EvidenceSchema.safeParse({ ...snippet, endLine: 14 }).success).toBe(false);
  });

  it('rejects highlighted lines outside the range', () => {
    expect(EvidenceSchema.safeParse({ ...snippet, highlightLines: [20] }).success).toBe(false);
  });

  it('requires at least one bounding box on a screenshot', () => {
    expect(
      EvidenceSchema.safeParse({
        id: 'e2',
        kind: 'screenshot',
        artifactId: 'art1',
        caption: 'Quote page',
        boxes: [],
      }).success,
    ).toBe(false);
  });
});
