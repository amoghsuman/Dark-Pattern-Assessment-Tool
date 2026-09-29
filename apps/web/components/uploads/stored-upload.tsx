import type { StoredUpload } from '@dpat/shared';
import { FileCheck2, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';

/** One uploaded file: name, size, checksum and storage mode, with optional extra controls. */
export function StoredUploadRow({
  upload,
  onRemove,
  children,
}: {
  upload: StoredUpload;
  onRemove?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border bg-muted/30 px-3 py-2">
      <FileCheck2 className="size-4 shrink-0 text-matrix-compliant" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{upload.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(upload.sizeBytes)} · SHA-256{' '}
          <span className="font-mono" title={upload.sha256}>
            {upload.sha256.slice(0, 16)}…
          </span>{' '}
          · {upload.storage === 'metadata_only' ? 'metadata only (sample mode)' : 'stored'}
        </p>
      </div>
      {children}
      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Remove ${upload.fileName}`}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      ) : null}
    </div>
  );
}
