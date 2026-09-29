import type { ArtifactKind } from '@dpat/shared';

/** What an upload is for. Each purpose has its own accepted types and size limit. */
export type UploadPurpose =
  'android_build' | 'ios_build' | 'source_archive' | 'config_file' | 'manual_capture';

const MB = 1024 * 1024;

interface Rule {
  extensions: Record<string, { kind: ArtifactKind; mimeType: string }>;
  maxBytes: number;
  /** APK, AAB, IPA and ZIP files must start with the ZIP signature. */
  zip: boolean;
  description: string;
}

export const UPLOAD_RULES: Record<UploadPurpose, Rule> = {
  android_build: {
    extensions: {
      apk: { kind: 'apk', mimeType: 'application/vnd.android.package-archive' },
      aab: { kind: 'aab', mimeType: 'application/x-authorware-bin' },
    },
    maxBytes: 500 * MB,
    zip: true,
    description: 'APK or AAB, up to 500 MB',
  },
  ios_build: {
    extensions: { ipa: { kind: 'ipa', mimeType: 'application/octet-stream' } },
    maxBytes: 500 * MB,
    zip: true,
    description: 'Decrypted IPA, up to 500 MB',
  },
  source_archive: {
    extensions: { zip: { kind: 'source_archive', mimeType: 'application/zip' } },
    maxBytes: 1024 * MB,
    zip: true,
    description: 'ZIP archive of the source, up to 1 GB',
  },
  config_file: {
    extensions: {
      yaml: { kind: 'config_file', mimeType: 'application/yaml' },
      yml: { kind: 'config_file', mimeType: 'application/yaml' },
      json: { kind: 'config_file', mimeType: 'application/json' },
      xml: { kind: 'config_file', mimeType: 'application/xml' },
      csv: { kind: 'config_file', mimeType: 'text/csv' },
      properties: { kind: 'config_file', mimeType: 'text/plain' },
      txt: { kind: 'config_file', mimeType: 'text/plain' },
      html: { kind: 'config_file', mimeType: 'text/html' },
      zip: { kind: 'config_file', mimeType: 'application/zip' },
    },
    maxBytes: 50 * MB,
    zip: false,
    description: 'YAML, JSON, XML, CSV, properties, text, HTML or ZIP, up to 50 MB each',
  },
  manual_capture: {
    extensions: {
      png: { kind: 'screenshot', mimeType: 'image/png' },
      jpg: { kind: 'screenshot', mimeType: 'image/jpeg' },
      jpeg: { kind: 'screenshot', mimeType: 'image/jpeg' },
      webp: { kind: 'screenshot', mimeType: 'image/webp' },
      mp4: { kind: 'screen_recording', mimeType: 'video/mp4' },
      webm: { kind: 'screen_recording', mimeType: 'video/webm' },
      mov: { kind: 'screen_recording', mimeType: 'video/quicktime' },
    },
    maxBytes: 500 * MB,
    zip: false,
    description:
      'PNG, JPG or WebP screenshots (up to 20 MB) or MP4, WebM or MOV recordings (up to 500 MB)',
  },
};

const SCREENSHOT_MAX = 20 * MB;

export type UploadCheck =
  | { ok: true; kind: ArtifactKind; mimeType: string; needsZipCheck: boolean }
  | { ok: false; error: string };

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
}

/** Checks name and size. The ZIP signature is checked separately because it reads the file. */
export function checkUpload(
  file: { name: string; size: number },
  purpose: UploadPurpose,
): UploadCheck {
  const rule = UPLOAD_RULES[purpose];
  const match = rule.extensions[extensionOf(file.name)];
  if (!match) return { ok: false, error: `${file.name}: expected ${rule.description}.` };
  if (file.size === 0) return { ok: false, error: `${file.name} is empty.` };
  const max = match.kind === 'screenshot' ? SCREENSHOT_MAX : rule.maxBytes;
  if (file.size > max) {
    return {
      ok: false,
      error: `${file.name} is ${Math.ceil(file.size / MB)} MB; the limit is ${max / MB} MB.`,
    };
  }
  return { ok: true, kind: match.kind, mimeType: match.mimeType, needsZipCheck: rule.zip };
}

export function acceptAttribute(purpose: UploadPurpose): string {
  return Object.keys(UPLOAD_RULES[purpose].extensions)
    .map((e) => `.${e}`)
    .join(',');
}
