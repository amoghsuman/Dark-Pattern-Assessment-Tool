import { createHash } from 'node:crypto';

import { createMemoryOverlayStore, createSampleRepositories } from '@dpat/shared';
import { describe, expect, it } from 'vitest';

import type { ReadableFile } from './apk-manifest';
import { uploadFile } from './upload-file';
import { acceptAttribute, checkUpload } from './validate';

const MB = 1024 * 1024;

function fakeFile(name: string, bytes: Uint8Array): ReadableFile & { name: string } {
  return {
    name,
    size: bytes.length,
    slice: (start, end) => ({ arrayBuffer: () => Promise.resolve(bytes.slice(start, end).buffer) }),
  };
}

describe('checkUpload', () => {
  it('accepts builds by extension and flags the ZIP check', () => {
    expect(checkUpload({ name: 'app-release.AAB', size: 10 * MB }, 'android_build')).toEqual({
      ok: true,
      kind: 'aab',
      mimeType: 'application/x-authorware-bin',
      needsZipCheck: true,
    });
    expect(checkUpload({ name: 'app.ipa', size: MB }, 'ios_build')).toMatchObject({
      ok: true,
      kind: 'ipa',
    });
  });

  it('rejects wrong types, empty files and oversize files', () => {
    const error = (name: string, size: number) => {
      const result = checkUpload({ name, size }, 'android_build');
      return result.ok ? null : result.error;
    };
    expect(error('app.exe', MB)).toMatch(/APK or AAB/);
    expect(error('app.apk', 0)).toMatch(/empty/);
    expect(error('app.apk', 501 * MB)).toMatch(/limit is 500 MB/);
  });

  it('applies the smaller limit to screenshots than to recordings', () => {
    expect(checkUpload({ name: 'otp.png', size: 21 * MB }, 'manual_capture')).toMatchObject({
      ok: false,
    });
    expect(checkUpload({ name: 'otp.mp4', size: 300 * MB }, 'manual_capture')).toMatchObject({
      ok: true,
      kind: 'screen_recording',
    });
  });

  it('lists accepted extensions for file inputs', () => {
    expect(acceptAttribute('android_build')).toBe('.apk,.aab');
  });
});

describe('uploadFile', () => {
  it('sends the file in chunks and completes with the SHA-256 of its contents', async () => {
    const repos = createSampleRepositories({ store: createMemoryOverlayStore(), latencyMs: 0 });
    const bytes = new Uint8Array(20 * MB + 123);
    for (let i = 0; i < bytes.length; i += 4096) bytes[i] = i % 251;
    const progress: number[] = [];
    const stored = await uploadFile(fakeFile('motor.aab', bytes), repos.uploads, {
      kind: 'aab',
      mimeType: 'application/x-authorware-bin',
      onProgress: (p) => progress.push(p.uploadedBytes),
    });
    expect(stored.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(stored).toMatchObject({
      fileName: 'motor.aab',
      sizeBytes: bytes.length,
      storage: 'metadata_only',
    });
    expect(progress).toEqual([8 * MB, 16 * MB, bytes.length]);
  });

  it('aborts the session when cancelled', async () => {
    const repos = createSampleRepositories({ store: createMemoryOverlayStore(), latencyMs: 0 });
    const controller = new AbortController();
    controller.abort();
    await expect(
      uploadFile(fakeFile('a.apk', new Uint8Array(1024)), repos.uploads, {
        kind: 'apk',
        mimeType: 'application/vnd.android.package-archive',
        signal: controller.signal,
      }),
    ).rejects.toThrow(/cancelled/);
  });
});
