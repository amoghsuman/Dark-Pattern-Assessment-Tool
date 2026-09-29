import { PATTERN_IDS, type PatternId } from '@dpat/rules';
import {
  EngineSchema,
  FindingStatusSchema,
  SeveritySchema,
  type Engine,
  type FindingFilter,
  type FindingStatus,
  type Severity,
} from '@dpat/shared';

/**
 * Findings filters live in the URL so a filtered view can be shared or bookmarked:
 * ?pattern=a,b&stage=x&severity=high&status=confirmed&engine=code_analysis&confidence=0.7&q=text
 */
export type SortKey = 'severity' | 'reference' | 'confidence' | 'updated';
export type SortDir = 'asc' | 'desc';

export interface FindingsQuery {
  filter: FindingFilter;
  sort: SortKey;
  dir: SortDir;
}

const list = (value: string | null): string[] =>
  value
    ? value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    : [];

function pick<T extends string>(values: string[], allowed: readonly T[]): T[] {
  return values.filter((v): v is T => (allowed as readonly string[]).includes(v));
}

const SORT_KEYS: readonly SortKey[] = ['severity', 'reference', 'confidence', 'updated'];

export function parseFindingsQuery(params: URLSearchParams): FindingsQuery {
  const filter: FindingFilter = {};
  const patterns = pick<PatternId>(list(params.get('pattern')), PATTERN_IDS);
  const stages = list(params.get('stage'));
  const severities = pick<Severity>(list(params.get('severity')), SeveritySchema.options);
  const statuses = pick<FindingStatus>(list(params.get('status')), FindingStatusSchema.options);
  const engines = pick<Engine>(list(params.get('engine')), EngineSchema.options);
  if (patterns.length) filter.patternIds = patterns;
  if (stages.length) filter.stageIds = stages;
  if (severities.length) filter.severities = severities;
  if (statuses.length) filter.statuses = statuses;
  if (engines.length) filter.engines = engines;

  const confidence = Number(params.get('confidence'));
  if (params.get('confidence') !== null && confidence > 0 && confidence <= 1)
    filter.minConfidence = confidence;
  const q = params.get('q')?.trim();
  if (q) filter.search = q;

  const sortParam = params.get('sort');
  const sort = SORT_KEYS.find((k) => k === sortParam) ?? 'severity';
  const dir: SortDir = params.get('dir') === 'desc' ? 'desc' : 'asc';
  return { filter, sort, dir };
}

export function serializeFindingsQuery({ filter, sort, dir }: FindingsQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, values: readonly string[] | undefined) => {
    if (values?.length) params.set(key, values.join(','));
  };
  set('pattern', filter.patternIds);
  set('stage', filter.stageIds);
  set('severity', filter.severities);
  set('status', filter.statuses);
  set('engine', filter.engines);
  if (filter.minConfidence !== undefined) params.set('confidence', String(filter.minConfidence));
  if (filter.search) params.set('q', filter.search);
  if (sort !== 'severity' || dir !== 'asc') {
    params.set('sort', sort);
    params.set('dir', dir);
  }
  // Commas read better than %2C in shared links.
  return params.toString().replace(/%2C/g, ',');
}

export function activeFilterCount(filter: FindingFilter): number {
  return (
    (filter.patternIds?.length ?? 0) +
    (filter.stageIds?.length ?? 0) +
    (filter.severities?.length ?? 0) +
    (filter.statuses?.length ?? 0) +
    (filter.engines?.length ?? 0) +
    (filter.minConfidence !== undefined ? 1 : 0) +
    (filter.search ? 1 : 0)
  );
}
