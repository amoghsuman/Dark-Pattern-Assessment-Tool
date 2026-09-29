import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { isZip, parseAxmlManifest, readApkManifest, type ReadableFile } from './apk-manifest';

/** Builds a minimal binary AndroidManifest.xml (UTF-16 string pool, one <manifest> element). */
function buildAxml(attrs: {
  package: string;
  versionName: string;
  versionCode: number;
}): Uint8Array {
  const strings = [
    'manifest',
    'package',
    'versionName',
    'versionCode',
    attrs.package,
    attrs.versionName,
  ];
  const encoded = strings.map((s) => {
    const b = new Uint8Array(2 + s.length * 2 + 2);
    const v = new DataView(b.buffer);
    v.setUint16(0, s.length, true);
    for (let i = 0; i < s.length; i++) v.setUint16(2 + i * 2, s.charCodeAt(i), true);
    return b;
  });
  const offsets: number[] = [];
  let total = 0;
  for (const e of encoded) {
    offsets.push(total);
    total += e.length;
  }
  const poolHeader = 28;
  const stringsStart = poolHeader + strings.length * 4;
  const poolSize = Math.ceil((stringsStart + total) / 4) * 4;
  const pool = new Uint8Array(poolSize);
  const pv = new DataView(pool.buffer);
  pv.setUint16(0, 0x0001, true);
  pv.setUint16(2, poolHeader, true);
  pv.setUint32(4, poolSize, true);
  pv.setUint32(8, strings.length, true);
  pv.setUint32(16, 0, true); // UTF-16
  pv.setUint32(20, stringsStart, true);
  offsets.forEach((o, i) => pv.setUint32(28 + i * 4, o, true));
  let cursor = stringsStart;
  for (const e of encoded) {
    pool.set(e, cursor);
    cursor += e.length;
  }

  const attrCount = 3;
  const element = new Uint8Array(36 + attrCount * 20);
  const ev = new DataView(element.buffer);
  ev.setUint16(0, 0x0102, true);
  ev.setUint16(2, 16, true);
  ev.setUint32(4, element.length, true);
  ev.setUint32(8, 1, true); // line
  ev.setUint32(12, 0xffffffff, true); // comment
  ev.setUint32(16, 0xffffffff, true); // ns
  ev.setUint32(20, 0, true); // name = "manifest"
  ev.setUint16(24, 20, true); // attributeStart
  ev.setUint16(26, 20, true); // attributeSize
  ev.setUint16(28, attrCount, true);
  const attr = (i: number, name: number, raw: number, type: number, data: number) => {
    const a = 36 + i * 20;
    ev.setUint32(a, 0xffffffff, true);
    ev.setUint32(a + 4, name, true);
    ev.setUint32(a + 8, raw, true);
    ev.setUint16(a + 12, 8, true);
    ev.setUint8(a + 15, type);
    ev.setUint32(a + 16, data, true);
  };
  attr(0, 1, 4, 0x03, 4); // package
  attr(1, 2, 5, 0x03, 5); // versionName
  attr(2, 3, 0xffffffff, 0x10, attrs.versionCode); // versionCode

  const out = new Uint8Array(8 + pool.length + element.length);
  const ov = new DataView(out.buffer);
  ov.setUint16(0, 0x0003, true);
  ov.setUint16(2, 8, true);
  ov.setUint32(4, out.length, true);
  out.set(pool, 8);
  out.set(element, 8 + pool.length);
  return out;
}

function asFile(bytes: Uint8Array): ReadableFile {
  return {
    size: bytes.length,
    slice: (start, end) => ({
      arrayBuffer: () => Promise.resolve(bytes.slice(start, end).buffer),
    }),
  };
}

describe('APK manifest reader', () => {
  const manifest = buildAxml({
    package: 'com.examplelife.motor',
    versionName: '2.1.0',
    versionCode: 210,
  });

  it('decodes package, versionName and versionCode from binary XML', () => {
    expect(parseAxmlManifest(manifest)).toEqual({
      packageName: 'com.examplelife.motor',
      versionName: '2.1.0',
      versionCode: 210,
    });
  });

  it('reads the manifest from a compressed APK without loading the whole file', async () => {
    const apk = zipSync({
      'classes.dex': new Uint8Array(4096).fill(7),
      'AndroidManifest.xml': manifest,
      'res/layout/main.xml': new Uint8Array([1, 2, 3]),
    });
    const file = asFile(apk);
    expect(await isZip(file)).toBe(true);
    expect(await readApkManifest(file)).toMatchObject({
      packageName: 'com.examplelife.motor',
      versionName: '2.1.0',
    });
  });

  it('returns null for an AAB (protobuf manifest) or a non-ZIP file', async () => {
    const aab = zipSync({ 'base/manifest/AndroidManifest.xml': new Uint8Array([10, 20, 30]) });
    expect(await readApkManifest(asFile(aab))).toBeNull();
    const text = new TextEncoder().encode('not a zip');
    expect(await isZip(asFile(text))).toBe(false);
    expect(await readApkManifest(asFile(text))).toBeNull();
  });
});
