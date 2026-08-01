/**
 * Minimal ZIP reader/writer.
 *
 * A .3mf is a zip, and so is our parts library, so both directions are needed.
 * Built on node:zlib rather than a dependency — the format surface we touch is
 * small (stored + deflate, no encryption, no zip64) and Bambu Studio writes and
 * reads plain deflate archives.
 */

import { deflateRaw, inflateRawSync } from 'node:zlib';
import { promisify } from 'node:util';

const deflateRawAsync = promisify(deflateRaw);

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

let crcTable: Uint32Array | null = null;

function crc32(buf: Buffer): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Read every member of a zip into a name -> bytes map. */
export function unzip(archive: Buffer): Map<string, Buffer> {
  // The end-of-central-directory record sits at the tail, after a comment of
  // unknown length, so scan backwards for its signature.
  let eocd = -1;
  for (let i = archive.length - 22; i >= 0 && i >= archive.length - 22 - 0xffff; i--) {
    if (archive.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('not a zip archive: no end-of-central-directory record');

  const count = archive.readUInt16LE(eocd + 10);
  let ptr = archive.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();

  for (let i = 0; i < count; i++) {
    if (archive.readUInt32LE(ptr) !== CENTRAL_SIG) {
      throw new Error(`corrupt zip: bad central directory entry at ${ptr}`);
    }
    const method = archive.readUInt16LE(ptr + 10);
    const compressedSize = archive.readUInt32LE(ptr + 20);
    const nameLen = archive.readUInt16LE(ptr + 28);
    const extraLen = archive.readUInt16LE(ptr + 30);
    const commentLen = archive.readUInt16LE(ptr + 32);
    const localOffset = archive.readUInt32LE(ptr + 42);
    const name = archive.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8');

    if (archive.readUInt32LE(localOffset) !== LOCAL_SIG) {
      throw new Error(`corrupt zip: bad local header for ${name}`);
    }
    // The local header repeats name/extra with its own lengths — trust those.
    const lNameLen = archive.readUInt16LE(localOffset + 26);
    const lExtraLen = archive.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const raw = archive.subarray(dataStart, dataStart + compressedSize);

    if (!name.endsWith('/')) {
      out.set(name, method === 0 ? Buffer.from(raw) : inflateRawSync(raw));
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/** A member whose deflate stream was computed ahead of time and can be reused. */
export interface Precompressed {
  deflated: Buffer;
  crc: number;
  rawSize: number;
}

/** Deflate once, so an unchanging member can be reused across many archives. */
export async function precompress(data: Buffer, level = 6): Promise<Precompressed> {
  return {
    deflated: await deflateRawAsync(data, { level }),
    crc: crc32(data),
    rawSize: data.length,
  };
}

export interface ZipEntry {
  name: string;
  /** Raw bytes, deflated on write. Mutually exclusive with `pre`. */
  data?: Buffer;
  /** Reuse a deflate stream produced earlier by `precompress`. */
  pre?: Precompressed;
}

/**
 * Write entries into a zip, preserving the given order.
 *
 * Async on purpose: this runs inside a web request, and deflating a multi-MB
 * mesh synchronously would stall the whole Node event loop. zlib's callback
 * form does the work on the libuv threadpool instead.
 */
export async function zip(entries: ZipEntry[], level = 6): Promise<Buffer> {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    let crc: number;
    let body: Buffer;
    let rawSize: number;
    if (entry.pre) {
      ({ crc, deflated: body, rawSize } = entry.pre);
    } else {
      if (!entry.data) throw new Error(`zip entry ${entry.name} has neither data nor pre`);
      crc = crc32(entry.data);
      rawSize = entry.data.length;
      body = await deflateRawAsync(entry.data, { level });
    }
    const method = 8;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_SIG, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10); // mod time
    local.writeUInt16LE(0x21, 12); // mod date — 1980-01-01, keeps output deterministic
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(rawSize, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_SIG, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(rawSize, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + body.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, centralBuf, eocd]);
}
