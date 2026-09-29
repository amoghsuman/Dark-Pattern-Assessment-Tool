import { inflateSync } from 'fflate';

/**
 * Reads the package name and version from an APK without loading the whole file: it locates the
 * ZIP central directory at the end of the file, finds AndroidManifest.xml, inflates only that
 * entry and decodes Android's binary XML (AXML). Returns null when the file is not a readable APK
 * (for example an AAB, whose manifest is protobuf); the user then enters the details by hand.
 */

export interface ApkManifestInfo {
  packageName: string;
  versionName?: string;
  versionCode?: number;
}

/** Anything with size and slice, e.g. a browser File or Blob. */
export interface ReadableFile {
  size: number;
  slice(start: number, end?: number): { arrayBuffer(): Promise<ArrayBuffer> };
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const MAX_EOCD_SEARCH = 65_557; // 22-byte record + max 65,535-byte comment

async function read(file: ReadableFile, start: number, end: number): Promise<DataView> {
  return new DataView(await file.slice(Math.max(0, start), Math.min(file.size, end)).arrayBuffer());
}

interface ZipEntry {
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

async function findEntry(file: ReadableFile, name: string): Promise<ZipEntry | null> {
  const tailStart = Math.max(0, file.size - MAX_EOCD_SEARCH);
  const tail = await read(file, tailStart, file.size);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const entries = tail.getUint16(eocd + 10, true);
  const cdSize = tail.getUint32(eocd + 12, true);
  const cdOffset = tail.getUint32(eocd + 16, true);
  const cd = await read(file, cdOffset, cdOffset + cdSize);
  const decoder = new TextDecoder();

  let p = 0;
  for (let n = 0; n < entries && p + 46 <= cd.byteLength; n++) {
    if (cd.getUint32(p, true) !== CENTRAL_SIGNATURE) return null;
    const method = cd.getUint16(p + 10, true);
    const compressedSize = cd.getUint32(p + 20, true);
    const nameLength = cd.getUint16(p + 28, true);
    const extraLength = cd.getUint16(p + 30, true);
    const commentLength = cd.getUint16(p + 32, true);
    const localHeaderOffset = cd.getUint32(p + 42, true);
    const entryName = decoder.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLength));
    if (entryName === name) return { method, compressedSize, localHeaderOffset };
    p += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

async function readEntry(file: ReadableFile, entry: ZipEntry): Promise<Uint8Array | null> {
  const header = await read(file, entry.localHeaderOffset, entry.localHeaderOffset + 30);
  if (header.getUint32(0, true) !== LOCAL_SIGNATURE) return null;
  const dataStart =
    entry.localHeaderOffset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
  const data = await read(file, dataStart, dataStart + entry.compressedSize);
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (entry.method === 0) return bytes;
  if (entry.method === 8) return inflateSync(bytes);
  return null;
}

// ---------------------------------------------------------------- AXML

const RES_XML_TYPE = 0x0003;
const RES_STRING_POOL_TYPE = 0x0001;
const RES_XML_START_ELEMENT_TYPE = 0x0102;
const UTF8_FLAG = 1 << 8;
const TYPE_INT_DEC = 0x10;
const TYPE_STRING = 0x03;

function readStringPool(view: DataView, offset: number): string[] {
  const stringCount = view.getUint32(offset + 8, true);
  const flags = view.getUint32(offset + 16, true);
  const stringsStart = view.getUint32(offset + 20, true);
  const utf8 = (flags & UTF8_FLAG) !== 0;
  const strings: string[] = [];
  const base = offset + stringsStart;

  for (let i = 0; i < stringCount; i++) {
    let p = base + view.getUint32(offset + 28 + i * 4, true);
    if (utf8) {
      // UTF-16 length then UTF-8 byte length, each 1 or 2 bytes.
      p += view.getUint8(p) & 0x80 ? 2 : 1;
      let byteLength = view.getUint8(p);
      if (byteLength & 0x80) {
        byteLength = ((byteLength & 0x7f) << 8) | view.getUint8(p + 1);
        p += 2;
      } else {
        p += 1;
      }
      strings.push(
        new TextDecoder().decode(new Uint8Array(view.buffer, view.byteOffset + p, byteLength)),
      );
    } else {
      let length = view.getUint16(p, true);
      if (length & 0x8000) {
        length = ((length & 0x7fff) << 16) | view.getUint16(p + 2, true);
        p += 4;
      } else {
        p += 2;
      }
      let s = '';
      for (let c = 0; c < length; c++) s += String.fromCharCode(view.getUint16(p + c * 2, true));
      strings.push(s);
    }
  }
  return strings;
}

/** Decodes the <manifest> element's package, versionName and versionCode from binary XML. */
export function parseAxmlManifest(bytes: Uint8Array): ApkManifestInfo | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.byteLength < 8 || view.getUint16(0, true) !== RES_XML_TYPE) return null;

  let strings: string[] = [];
  let p = view.getUint16(2, true);
  while (p + 8 <= view.byteLength) {
    const type = view.getUint16(p, true);
    const size = view.getUint32(p + 4, true);
    if (size === 0) return null;
    if (type === RES_STRING_POOL_TYPE) strings = readStringPool(view, p);
    if (type === RES_XML_START_ELEMENT_TYPE) {
      const name = strings[view.getUint32(p + 20, true)];
      if (name !== 'manifest') return null;
      const attrStart = view.getUint16(p + 24, true);
      const attrSize = view.getUint16(p + 26, true);
      const attrCount = view.getUint16(p + 28, true);
      const info: Partial<ApkManifestInfo> = {};
      for (let i = 0; i < attrCount; i++) {
        const a = p + 16 + attrStart + i * attrSize;
        const attrName = strings[view.getUint32(a + 4, true)];
        const raw = view.getUint32(a + 8, true);
        const dataType = view.getUint8(a + 15);
        const data = view.getUint32(a + 16, true);
        const text =
          raw !== 0xffffffff ? strings[raw] : dataType === TYPE_STRING ? strings[data] : undefined;
        if (attrName === 'package' && text) info.packageName = text;
        if (attrName === 'versionName' && text) info.versionName = text;
        if (attrName === 'versionCode' && dataType === TYPE_INT_DEC) info.versionCode = data;
      }
      return info.packageName ? (info as ApkManifestInfo) : null;
    }
    p += size;
  }
  return null;
}

export async function readApkManifest(file: ReadableFile): Promise<ApkManifestInfo | null> {
  try {
    const entry = await findEntry(file, 'AndroidManifest.xml');
    if (!entry) return null;
    const bytes = await readEntry(file, entry);
    return bytes ? parseAxmlManifest(bytes) : null;
  } catch {
    return null;
  }
}

/** True when the file starts with the ZIP local-file signature (APK, AAB and IPA are ZIPs). */
export async function isZip(file: ReadableFile): Promise<boolean> {
  if (file.size < 4) return false;
  const head = await read(file, 0, 4);
  return head.getUint32(0, true) === LOCAL_SIGNATURE;
}
