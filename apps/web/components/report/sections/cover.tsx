import Image from 'next/image';

import { brand } from '@/config/brand';
import { formatDate } from '@/lib/format';

import type { ReportData } from '../report-types';

export function CoverSection({ data }: { data: ReportData }) {
  const { assessment } = data.detail;
  return (
    <div className="flex min-h-[40rem] flex-col justify-between print:min-h-[250mm]">
      <div className="flex items-center gap-3">
        <Image src={brand.logoPath} alt="" width={36} height={36} />
        <span className="font-semibold">{brand.productName}</span>
      </div>
      <div className="space-y-4">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Dark pattern assessment report
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance">{assessment.name}</h1>
        <p className="text-lg">{data.organization.name}</p>
        {assessment.description ? (
          <p className="max-w-2xl text-muted-foreground">{assessment.description}</p>
        ) : null}
      </div>
      <div className="max-w-2xl space-y-3">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Assessment period</dt>
            <dd>
              {formatDate(assessment.startedAt ?? assessment.createdAt)}
              {assessment.completedAt
                ? ` to ${formatDate(assessment.completedAt)}`
                : ' (in progress)'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Report generated</dt>
            <dd>{formatDate(data.generatedAt.toISOString())}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Standard</dt>
            <dd>CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Rule pack set</dt>
            <dd className="font-mono text-xs leading-5">{assessment.rulePackSetVersion}</dd>
          </div>
        </dl>

        <div className="rounded-md border border-matrix-in-progress/60 bg-matrix-in-progress/10 px-3 py-2 text-xs">
          Draft: rule packs are pending compliance review. Findings marked Detected or Under Review
          have not yet been confirmed by a reviewer.
        </div>
        <div className="text-xs text-muted-foreground">
          Confidential. Prepared for {data.organization.name}.
        </div>
      </div>
    </div>
  );
}
