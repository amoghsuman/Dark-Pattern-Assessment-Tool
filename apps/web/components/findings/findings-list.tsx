'use client';

import { getPatternInfo, PATTERNS } from '@dpat/rules';
import {
  ENGINE_LABELS,
  ENGINE_ORDER,
  FINDING_STATUS_LABELS,
  FindingStatusSchema,
  matchesFindingFilter,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  type Finding,
  type FindingFilter,
  type FindingStatus,
} from '@dpat/shared';
import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter, Search, X } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { FindingStatusBadge, SEVERITY_DOT, SeverityBadge } from '@/components/common/badges';
import { EmptyState, ErrorState } from '@/components/common/page-states';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useFindings, useOrganization, useUpdateFindingStatus } from '@/lib/data/hooks';
import {
  activeFilterCount,
  parseFindingsQuery,
  serializeFindingsQuery,
  type FindingsQuery,
  type SortKey,
} from '@/lib/findings/filter-params';
import { formatPercent, formatRelative } from '@/lib/format';
import { useRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';

import { FacetFilter } from './facet-filter';

const CONFIDENCE_OPTIONS = [
  { value: 'any', label: 'Any confidence' },
  { value: '0.5', label: '50% or higher' },
  { value: '0.7', label: '70% or higher' },
  { value: '0.9', label: '90% or higher' },
];

function sortFindings(findings: Finding[], sort: SortKey, dir: 'asc' | 'desc'): Finding[] {
  const factor = dir === 'asc' ? 1 : -1;
  const compare = (a: Finding, b: Finding): number => {
    switch (sort) {
      case 'severity':
        return (
          SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
          a.reference.localeCompare(b.reference)
        );
      case 'reference':
        return a.reference.localeCompare(b.reference);
      case 'confidence':
        return a.confidence - b.confidence;
      case 'updated':
        return a.updatedAt.localeCompare(b.updatedAt);
    }
  };
  return [...findings].sort((a, b) => compare(a, b) * factor);
}

export function FindingsList({ assessmentId }: { assessmentId: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = useMemo(() => parseFindingsQuery(new URLSearchParams(params.toString())), [params]);
  const { filter, sort, dir } = query;

  // All findings for facet counts; the filtered list comes from the repository (server-side in Stage C).
  const all = useFindings(assessmentId);
  const filtered = useFindings(assessmentId, filter);
  const { data: organization } = useOrganization();
  const role = useRole();
  const update = useUpdateFindingStatus();

  const [search, setSearch] = useState(filter.search ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<FindingStatus | ''>('');
  const [bulkNote, setBulkNote] = useState('');

  // The most recently requested query. router.replace applies asynchronously, so a debounced
  // search must build on this, not on a render-time `filter` that may predate "Clear filters".
  const latest = useRef(query);
  useEffect(() => {
    latest.current = query;
  }, [query]);

  const navigate = (next: FindingsQuery) => {
    latest.current = next;
    const qs = serializeFindingsQuery(next);
    router.replace((qs ? `${pathname}?${qs}` : pathname) as Route, { scroll: false });
  };
  /** `undefined` or an empty list clears that filter. */
  const setFilter = (patch: { [K in keyof FindingFilter]?: FindingFilter[K] | undefined }) => {
    const base = latest.current;
    const merged = { ...base.filter, ...patch } as FindingFilter;
    for (const key of Object.keys(merged) as (keyof FindingFilter)[]) {
      const v = merged[key];
      if (v === undefined || (Array.isArray(v) && v.length === 0) || v === '') delete merged[key];
    }
    navigate({ ...base, filter: merged });
  };

  // Debounce free-text search into the URL.
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === (filter.search ?? '')) return;
    const t = setTimeout(() => setFilter({ search: trimmed || undefined }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [search]);

  const rows = useMemo(
    () => sortFindings(filtered.data ?? [], sort, dir),
    [filtered.data, sort, dir],
  );
  const visibleIds = new Set(rows.map((r) => r.id));
  const selectedVisible = [...selected].filter((id) => visibleIds.has(id));

  /** Facet counts reflect the other active filters, so options never promise empty results. */
  const facetCount = (predicate: (f: Finding) => boolean, without: keyof FindingFilter) => {
    const { [without]: _omit, ...rest } = filter;
    return (all.data ?? []).filter((f) => matchesFindingFilter(f, rest) && predicate(f)).length;
  };

  const toggleSort = (key: SortKey) =>
    navigate({ ...query, sort: key, dir: sort === key && dir === 'asc' ? 'desc' : 'asc' });

  const applyBulk = () => {
    if (!bulkStatus || selectedVisible.length === 0) return;
    update.mutate(
      {
        ids: selectedVisible,
        to: bulkStatus,
        ...(bulkNote.trim() ? { note: bulkNote.trim() } : {}),
      },
      {
        onSuccess: (result) => {
          const updated = result.updated.length;
          const skipped = result.skipped.length;
          if (updated > 0)
            toast.success(
              `Updated ${updated} ${updated === 1 ? 'finding' : 'findings'} to ${FINDING_STATUS_LABELS[bulkStatus]}`,
            );
          if (skipped > 0) {
            const refs = new Map((all.data ?? []).map((f) => [f.id, f.reference]));
            toast.warning(`Skipped ${skipped}`, {
              description: result.skipped
                .map((s) => `${refs.get(s.findingId) ?? s.findingId}: ${s.reason}`)
                .join('\n'),
            });
          }
          setSelected(new Set());
          setBulkStatus('');
          setBulkNote('');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const error = all.error ?? filtered.error;
  if (error) return <ErrorState error={error} />;

  const stages = organization?.journeyStages ?? [];
  const activeCount = activeFilterCount(filter);
  const canChangeStatus = role !== null && role !== 'viewer';
  const allVisibleSelected = rows.length > 0 && selectedVisible.length === rows.length;

  const sortHeader = (key: SortKey, label: string, className?: string) => (
    <TableHead
      className={className}
      aria-sort={sort === key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => toggleSort(key)}
      >
        {label}
        {sort === key ? (
          dir === 'asc' ? (
            <ArrowUp className="size-3.5" aria-hidden />
          ) : (
            <ArrowDown className="size-3.5" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />
        )}
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Filter findings">
        <div className="relative w-full sm:w-64">
          <Search
            className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, title, file"
            aria-label="Search findings"
            className="h-8 pl-8"
          />
        </div>
        <FacetFilter
          title="Pattern"
          selected={filter.patternIds ?? []}
          onChange={(v) => setFilter({ patternIds: v })}
          options={PATTERNS.map((p) => ({
            value: p.id,
            label: p.name,
            count: facetCount((f) => f.patternId === p.id, 'patternIds'),
          }))}
        />
        <FacetFilter
          title="Stage"
          selected={filter.stageIds ?? []}
          onChange={(v) => setFilter({ stageIds: v })}
          options={stages.map((s) => ({
            value: s.id,
            label: s.name,
            count: facetCount((f) => f.stageId === s.id, 'stageIds'),
          }))}
        />
        <FacetFilter
          title="Severity"
          selected={filter.severities ?? []}
          onChange={(v) => setFilter({ severities: v })}
          options={SEVERITY_ORDER.map((s) => ({
            value: s,
            label: SEVERITY_LABELS[s],
            count: facetCount((f) => f.severity === s, 'severities'),
            marker: <span aria-hidden className={cn('size-2 rounded-full', SEVERITY_DOT[s])} />,
          }))}
        />
        <FacetFilter
          title="Status"
          selected={filter.statuses ?? []}
          onChange={(v) => setFilter({ statuses: v })}
          options={FindingStatusSchema.options.map((s) => ({
            value: s,
            label: FINDING_STATUS_LABELS[s],
            count: facetCount((f) => f.status === s, 'statuses'),
          }))}
        />
        <FacetFilter
          title="Engine"
          selected={filter.engines ?? []}
          onChange={(v) => setFilter({ engines: v })}
          options={ENGINE_ORDER.filter((e) => e !== 'correlation').map((e) => ({
            value: e,
            label: ENGINE_LABELS[e],
            count: facetCount((f) => f.engine === e, 'engines'),
          }))}
        />
        <Select
          value={filter.minConfidence !== undefined ? String(filter.minConfidence) : 'any'}
          onValueChange={(v) => setFilter({ minConfidence: v === 'any' ? undefined : Number(v) })}
        >
          <SelectTrigger
            size="sm"
            className="h-8 w-40 border-dashed"
            aria-label="Filter by confidence"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONFIDENCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => {
              setSearch('');
              navigate({ filter: {}, sort, dir });
            }}
          >
            Clear filters
            <X />
          </Button>
        ) : null}
        <span
          className="ml-auto text-sm text-muted-foreground"
          aria-live="polite"
          data-testid="result-count"
        >
          {filtered.data ? `${rows.length} of ${all.data?.length ?? rows.length} findings` : ''}
        </span>
      </div>

      {canChangeStatus && selectedVisible.length > 0 ? (
        <div
          className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3"
          role="region"
          aria-label="Bulk actions"
        >
          <span className="text-sm font-medium">{selectedVisible.length} selected</span>
          <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as FindingStatus)}>
            <SelectTrigger size="sm" className="h-8 w-52" aria-label="New status">
              <SelectValue placeholder="Change status to…" />
            </SelectTrigger>
            <SelectContent>
              {FindingStatusSchema.options.map((s) => (
                <SelectItem key={s} value={s}>
                  {FINDING_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={bulkNote}
            onChange={(e) => setBulkNote(e.target.value)}
            placeholder="Note for the audit trail (optional)"
            aria-label="Note for the audit trail"
            rows={1}
            className="min-h-8 flex-1 py-1.5 text-sm md:min-w-64"
          />
          <Button size="sm" onClick={applyBulk} disabled={!bulkStatus || update.isPending}>
            {update.isPending ? 'Applying…' : 'Apply'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Changes your role cannot make, or that skip a review step, are skipped and listed.
          </p>
        </div>
      ) : null}

      {filtered.isPending || all.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ListFilter}
          title="No findings match these filters"
          description="Clear some filters or change the search."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                {canChangeStatus ? (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        allVisibleSelected
                          ? true
                          : selectedVisible.length > 0
                            ? 'indeterminate'
                            : false
                      }
                      onCheckedChange={(v) =>
                        setSelected(v === true ? new Set(rows.map((r) => r.id)) : new Set())
                      }
                      aria-label="Select all findings shown"
                    />
                  </TableHead>
                ) : null}
                {sortHeader('reference', 'Reference', 'w-32')}
                <TableHead className="min-w-80">Finding</TableHead>
                <TableHead className="hidden xl:table-cell">Stage</TableHead>
                {sortHeader('severity', 'Severity')}
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Engine</TableHead>
                {sortHeader('confidence', 'Confidence')}
                {sortHeader('updated', 'Updated', 'hidden text-right lg:table-cell')}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((f) => {
                const href = `/assessments/${assessmentId}/findings/${f.id}` as Route;
                return (
                  <TableRow
                    key={f.id}
                    data-state={selected.has(f.id) ? 'selected' : undefined}
                    className="cursor-pointer"
                    onClick={() => router.push(href)}
                  >
                    {canChangeStatus ? (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(f.id)}
                          onCheckedChange={(v) => {
                            const next = new Set(selected);
                            if (v === true) next.add(f.id);
                            else next.delete(f.id);
                            setSelected(next);
                          }}
                          aria-label={`Select ${f.reference}`}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className="font-mono text-xs">{f.reference}</TableCell>
                    <TableCell className="py-2.5 whitespace-normal">
                      <Link
                        href={href}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                      >
                        {f.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {getPatternInfo(f.patternId).name}
                      </p>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                      {stages.find((s) => s.id === f.stageId)?.name ?? f.stageId}
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={f.severity} />
                    </TableCell>
                    <TableCell>
                      <FindingStatusBadge status={f.status} />
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {ENGINE_LABELS[f.engine]}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {formatPercent(f.confidence)}
                    </TableCell>
                    <TableCell className="hidden text-right text-xs text-muted-foreground lg:table-cell">
                      {formatRelative(f.updatedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
