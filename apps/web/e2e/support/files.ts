import { zipSync } from 'fflate';

/** Minimal binary AndroidManifest.xml with package and versionName (UTF-16 string pool). */
function buildAxml(packageName: string, versionName: string): Uint8Array {
  const strings = ['manifest', 'package', 'versionName', packageName, versionName];
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
  const stringsStart = 28 + strings.length * 4;
  const poolSize = Math.ceil((stringsStart + total) / 4) * 4;
  const pool = new Uint8Array(poolSize);
  const pv = new DataView(pool.buffer);
  pv.setUint16(0, 0x0001, true);
  pv.setUint16(2, 28, true);
  pv.setUint32(4, poolSize, true);
  pv.setUint32(8, strings.length, true);
  pv.setUint32(20, stringsStart, true);
  offsets.forEach((o, i) => pv.setUint32(28 + i * 4, o, true));
  let cursor = stringsStart;
  for (const e of encoded) {
    pool.set(e, cursor);
    cursor += e.length;
  }
  const element = new Uint8Array(36 + 2 * 20);
  const ev = new DataView(element.buffer);
  ev.setUint16(0, 0x0102, true);
  ev.setUint16(2, 16, true);
  ev.setUint32(4, element.length, true);
  ev.setUint32(12, 0xffffffff, true);
  ev.setUint32(16, 0xffffffff, true);
  ev.setUint32(20, 0, true);
  ev.setUint16(24, 20, true);
  ev.setUint16(26, 20, true);
  ev.setUint16(28, 2, true);
  [
    [1, 3],
    [2, 4],
  ].forEach(([name, value], i) => {
    const a = 36 + i * 20;
    ev.setUint32(a, 0xffffffff, true);
    ev.setUint32(a + 4, name!, true);
    ev.setUint32(a + 8, value!, true);
    ev.setUint16(a + 12, 8, true);
    ev.setUint8(a + 15, 0x03);
    ev.setUint32(a + 16, value!, true);
  });
  const out = new Uint8Array(8 + pool.length + element.length);
  const ov = new DataView(out.buffer);
  ov.setUint16(0, 0x0003, true);
  ov.setUint16(2, 8, true);
  ov.setUint32(4, out.length, true);
  out.set(pool, 8);
  out.set(element, 8 + pool.length);
  return out;
}

export function apkFile(packageName: string, versionName: string) {
  const bytes = zipSync({
    'AndroidManifest.xml': buildAxml(packageName, versionName),
    'classes.dex': new Uint8Array(2048).fill(9),
  });
  return {
    name: 'motor-release.apk',
    mimeType: 'application/vnd.android.package-archive',
    buffer: Buffer.from(bytes),
  };
}

export function textFile(name: string, content: string, mimeType = 'text/plain') {
  return { name, mimeType, buffer: Buffer.from(content) };
}

/** A tiny valid PNG (1 x 1 pixel). */
export function pngFile(name: string) {
  return {
    name,
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    ),
  };
}
