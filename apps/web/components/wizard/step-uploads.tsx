'use client';

import type { ArtifactKind } from '@dpat/shared';
import { FileArchive, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { draftId, uploadKindFor } from '@/lib/wizard/draft';

import { FieldError } from './field';
import { useWizard } from './wizard-context';

const KIND_LABELS: Partial<Record<ArtifactKind, string>> = {
  apk: 'Android package (APK)',
  ipa: 'iOS package (IPA)',
  source_archive: 'Source archive',
  config_file: 'Configuration file',
  api_spec: 'API specification',
};

export function StepUploads() {
  const { draft, update, errors } = useWizard();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const add = (files: FileList | null) => {
    if (!files?.length) return;
    const added = Array.from(files).map((f) => ({
      id: draftId('upl'),
      fileName: f.name,
      sizeBytes: f.size,
      kind: uploadKindFor(f.name),
    }));
    update((d) => ({ ...d, uploads: [...d.uploads, ...added] }));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    add(e.dataTransfer.files);
  };

  const expected: string[] = [];
  if (draft.targetTypes.includes('mobile_app')) {
    expected.push(draft.mobile.platform === 'ios' ? 'the IPA build' : 'the APK build');
  }
  if (draft.targetTypes.includes('code_repository')) expected.push('a source archive');
  expected.push('pricing, notification or billing configuration', 'API specifications');

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Useful here: {expected.join(', ')}. In this version only file names and sizes are recorded;
        files are not uploaded.
      </p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging ? 'border-brand bg-brand/5' : 'border-border',
        )}
      >
        <Upload className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Drag files here</p>
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
          Choose files
        </Button>
        <input
          ref={input}
          type="file"
          multiple
          className="sr-only"
          aria-label="Choose files to upload"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      <FieldError message={errors.uploads} />
      {draft.uploads.length > 0 ? (
        <ul className="divide-y rounded-md border" aria-label="Selected files">
          {draft.uploads.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <FileArchive className="size-4 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{u.fileName}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatBytes(u.sizeBytes)}
              </span>
              <Select
                value={u.kind}
                onValueChange={(kind) =>
                  update((d) => ({
                    ...d,
                    uploads: d.uploads.map((x) =>
                      x.id === u.id ? { ...x, kind: kind as ArtifactKind } : x,
                    ),
                  }))
                }
              >
                <SelectTrigger
                  size="sm"
                  className="w-52"
                  aria-label={`File type for ${u.fileName}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KIND_LABELS).map(([kind, label]) => (
                    <SelectItem key={kind} value={kind}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Remove ${u.fileName}`}
                onClick={() =>
                  update((d) => ({ ...d, uploads: d.uploads.filter((x) => x.id !== u.id) }))
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
