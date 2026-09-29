import type { ArtifactKind, StoredUpload, UploadRepository } from '@dpat/shared';
import { createSHA256 } from 'hash-wasm';

import type { ReadableFile } from './apk-manifest';

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
}

export interface UploadOptions {
  kind: ArtifactKind;
  mimeType: string;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

/**
 * Chunked, resumable-style upload through the UploadRepository. Each chunk is read once: it is
 * hashed (SHA-256, incrementally, so large builds never sit in memory) and sent. Sample mode
 * stores metadata only; Stage C's repository sends the bytes to Supabase Storage.
 */
export async function uploadFile(
  file: ReadableFile & { name: string },
  repository: UploadRepository,
  options: UploadOptions,
): Promise<StoredUpload> {
  const hasher = await createSHA256();
  hasher.init();
  let session = await repository.start({
    fileName: file.name,
    sizeBytes: file.size,
    mimeType: options.mimeType,
    kind: options.kind,
  });

  try {
    while (session.uploadedBytes < file.size) {
      if (options.signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError');
      const offset = session.uploadedBytes;
      const end = Math.min(file.size, offset + session.chunkSize);
      const bytes = new Uint8Array(await file.slice(offset, end).arrayBuffer());
      hasher.update(bytes);
      session = await repository.appendChunk(session.id, {
        offset,
        size: bytes.byteLength,
        data: new Blob([bytes]),
      });
      options.onProgress?.({ uploadedBytes: session.uploadedBytes, totalBytes: file.size });
    }
    return await repository.complete(session.id, hasher.digest('hex'));
  } catch (error) {
    await repository.abort(session.id);
    throw error;
  }
}
