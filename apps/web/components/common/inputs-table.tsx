import { CONFIG_TYPE_LABELS, type Artifact, type JourneyStage, type Target } from '@dpat/shared';

import { formatBytes } from '@/lib/format';

const KIND_LABELS: Record<Artifact['kind'], string> = {
  screenshot: 'Screenshot',
  screen_recording: 'Screen recording',
  dom_snapshot: 'DOM snapshot',
  source_archive: 'Source archive',
  apk: 'Android build (APK)',
  aab: 'Android build (AAB)',
  ipa: 'iOS build (IPA)',
  config_file: 'Configuration',
  api_spec: 'API specification',
};

export function artifactTypeLabel(a: Artifact): string {
  if (a.kind === 'config_file' && a.configType) return CONFIG_TYPE_LABELS[a.configType];
  return KIND_LABELS[a.kind];
}

/** Files received for an assessment (uploads and manual captures) with checksums for the audit trail. */
export function InputsTable({
  artifacts,
  targets,
  stages,
  compact = false,
}: {
  artifacts: Artifact[];
  targets: Target[];
  stages: JourneyStage[];
  compact?: boolean;
}) {
  const inputs = artifacts.filter((a) => a.origin !== 'captured');
  if (inputs.length === 0)
    return <p className="text-sm text-muted-foreground">No files uploaded.</p>;
  const targetName = new Map(targets.map((t) => [t.id, t.name]));
  const stageName = new Map(stages.map((s) => [s.id, s.name]));

  return (
    <div className="overflow-x-auto print:overflow-visible" tabIndex={0}>
      <table
        className="w-full border-collapse text-left text-xs [&_td]:border-b [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top [&_th]:border-b-2 [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-semibold"
        aria-label="Inputs received"
      >
        <thead>
          <tr>
            <th>File</th>
            <th>Type</th>
            {!compact ? <th>Target</th> : null}
            <th>Size</th>
            <th>SHA-256</th>
          </tr>
        </thead>
        <tbody>
          {inputs.map((a) => (
            <tr key={a.id}>
              <td className="break-all">
                {a.fileName ?? a.uri}
                {a.origin === 'manual_capture' ? (
                  <span className="block text-muted-foreground">
                    Manual capture · {a.stageId ? stageName.get(a.stageId) : ''}
                    {a.note ? ` · ${a.note}` : ''}
                  </span>
                ) : null}
              </td>
              <td>{artifactTypeLabel(a)}</td>
              {!compact ? <td>{a.targetId ? targetName.get(a.targetId) : '—'}</td> : null}
              <td className="whitespace-nowrap">
                {a.sizeBytes !== undefined ? formatBytes(a.sizeBytes) : '—'}
              </td>
              <td className="font-mono" title={a.sha256}>
                {a.sha256 ? `${a.sha256.slice(0, 12)}…` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
