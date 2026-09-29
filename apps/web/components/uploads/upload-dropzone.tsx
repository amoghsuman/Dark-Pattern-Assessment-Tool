'use client';

import type { StoredUpload } from '@dpat/shared';
import { FileUp, X } from 'lucide-react';
import { useId, useRef, useState, type DragEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUploadRepository } from '@/lib/data/hooks';
import { formatBytes } from '@/lib/format';
import { isZip } from '@/lib/uploads/apk-manifest';
import { uploadFile } from '@/lib/uploads/upload-file';
import {
  acceptAttribute,
  checkUpload,
  UPLOAD_RULES,
  type UploadPurpose,
} from '@/lib/uploads/validate';
import { cn } from '@/lib/utils';

interface InFlight {
  id: string;
  name: string;
  size: number;
  uploaded: number;
  controller: AbortController;
}

/**
 * Validates, hashes and uploads files through the UploadRepository in chunks. `onUploaded`
 * receives the stored upload (metadata and SHA-256) and the original File, for example to read
 * an APK manifest.
 */
export function UploadDropzone({
  purpose,
  multiple = false,
  label,
  onUploaded,
  disabled = false,
}: {
  purpose: UploadPurpose;
  multiple?: boolean;
  label: string;
  onUploaded: (upload: StoredUpload, file: File) => void | Promise<void>;
  disabled?: boolean;
}) {
  const repository = useUploadRepository();
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [inFlight, setInFlight] = useState<InFlight[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handle = async (files: FileList | File[] | null) => {
    if (!files || disabled) return;
    const list = Array.from(files).slice(0, multiple ? undefined : 1);
    setErrors([]);
    for (const file of list) {
      const check = checkUpload(file, purpose);
      if (!check.ok) {
        setErrors((e) => [...e, check.error]);
        continue;
      }
      if (check.needsZipCheck && !(await isZip(file))) {
        setErrors((e) => [
          ...e,
          `${file.name} is not a valid ${UPLOAD_RULES[purpose].description.split(',')[0]} (not a ZIP package).`,
        ]);
        continue;
      }
      const job: InFlight = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        uploaded: 0,
        controller: new AbortController(),
      };
      setInFlight((j) => [...j, job]);
      try {
        const stored = await uploadFile(file, repository, {
          kind: check.kind,
          mimeType: file.type || check.mimeType,
          signal: job.controller.signal,
          onProgress: ({ uploadedBytes }) =>
            setInFlight((all) =>
              all.map((x) => (x.id === job.id ? { ...x, uploaded: uploadedBytes } : x)),
            ),
        });
        await onUploaded(stored, file);
      } catch (err) {
        const cancelled = err instanceof DOMException && err.name === 'AbortError';
        setErrors((e) => [
          ...e,
          cancelled
            ? `${file.name}: upload cancelled.`
            : `${file.name}: ${err instanceof Error ? err.message : 'upload failed'}`,
        ]);
      } finally {
        setInFlight((all) => all.filter((x) => x.id !== job.id));
      }
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void handle(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragging ? 'border-brand bg-brand/5' : 'border-border',
          disabled && 'opacity-60',
        )}
      >
        <FileUp className="size-5 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{UPLOAD_RULES[purpose].description}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          Choose {multiple ? 'files' : 'file'}
        </Button>
        <input
          ref={input}
          id={inputId}
          type="file"
          multiple={multiple}
          accept={acceptAttribute(purpose)}
          className="sr-only"
          aria-label={label}
          disabled={disabled}
          onChange={(e) => {
            void handle(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {inFlight.map((job) => (
        <div
          key={job.id}
          className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
          aria-live="polite"
        >
          <span className="min-w-0 flex-1 truncate">{job.name}</span>
          <Progress
            value={(job.uploaded / Math.max(1, job.size)) * 100}
            className="h-1.5 w-32"
            aria-label={`Uploading ${job.name}`}
          />
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatBytes(job.uploaded)} / {formatBytes(job.size)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`Cancel ${job.name}`}
            onClick={() => job.controller.abort()}
          >
            <X />
          </Button>
        </div>
      ))}
      {errors.length > 0 ? (
        <ul role="alert" className="space-y-1 text-sm text-destructive">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
