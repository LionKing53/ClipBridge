// Only individually reviewed, hash-pinned documentation PNGs may bypass text scans.
import { createHash } from 'node:crypto';
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export function documentationImagePolicy(manifest) {
  const entries = manifest.documentationImages || [];
  if (!Array.isArray(entries)) throw new Error('Invalid documentation image policy.');
  const result = new Map();
  for (const entry of entries) {
    if (!/^docs\/images\/[a-z0-9-]+\.png$/.test(entry.path || '') ||
        !manifest.files.includes(entry.path) || result.has(entry.path) ||
        !/^[a-f0-9]{64}$/.test(entry.sha256 || '') || !Number.isSafeInteger(entry.bytes) ||
        entry.bytes < 33 || entry.bytes > 2 * 1024 ** 2 ||
        !Number.isInteger(entry.width) || !Number.isInteger(entry.height) ||
        entry.width < 1 || entry.height < 1 || entry.width > 4096 || entry.height > 4096) {
      throw new Error('Invalid reviewed documentation image.');
    }
    result.set(entry.path, entry);
  }
  return result;
}
export function historicalDocumentationImagePolicy(manifest) {
  const entries = manifest.historicalDocumentationImages || [];
  if (!Array.isArray(entries)) throw new Error('Invalid historical image policy.');
  const seen = new Set();
  return entries.map(entry => {
    documentationImagePolicy({ files: manifest.files, documentationImages: [entry] });
    const key = `${entry.path}:${entry.sha256}`;
    if (seen.has(key)) throw new Error('Duplicate historical image pin.');
    seen.add(key);
    return entry;
  });
}
export function matchesDocumentationImage(buffer, entry) {
  if (!entry || buffer.length !== entry.bytes || !buffer.subarray(0, 8).equals(signature) ||
      createHash('sha256').update(buffer).digest('hex') !== entry.sha256 ||
      buffer.toString('ascii', 12, 16) !== 'IHDR' || buffer.readUInt32BE(16) !== entry.width ||
      buffer.readUInt32BE(20) !== entry.height) return false;
  // Reject textual/EXIF metadata and arbitrary ancillary chunks even when hash-pinned.
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const size = buffer.readUInt32BE(offset), type = buffer.toString('ascii', offset + 4, offset + 8);
    if (!['IHDR', 'IDAT', 'IEND', 'sRGB', 'gAMA', 'cHRM', 'pHYs', 'PLTE', 'tRNS'].includes(type) || offset + size + 12 > buffer.length) return false;
    offset += size + 12;
    if (type === 'IEND') return size === 0 && offset === buffer.length;
  }
  return false;
}
