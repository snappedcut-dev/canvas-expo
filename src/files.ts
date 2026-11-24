/**
 * Turning an export into a file on the device.
 *
 * Pure, and in its own file, because this is the part that is easy to get
 * subtly wrong and impossible to notice: a wrong extension still saves, a
 * mis-split data URI still writes bytes, and both produce a file the gallery
 * refuses hours later.
 */

import type { ExportFormat } from '@snappedcut/canvas-react-native';

/** What `export()` hands back, decomposed into something writable. */
export type DecodedExport = {
  /** Base64 with no `data:` prefix — what expo-file-system wants. */
  base64: string;
  mimeType: string;
  extension: string;
};

const MIME: Record<ExportFormat, string> = {
  webm: 'video/webm',
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  gif: 'image/gif',
  png: 'image/png',
};

/** The container extension for a format. `mkv` is not its own mime guess. */
export function extensionFor(format: ExportFormat): string {
  return format;
}

export function mimeFor(format: ExportFormat): string {
  return MIME[format] ?? 'application/octet-stream';
}

/**
 * Split a `data:` URI into something that can be written to disk.
 *
 * A WebView cannot hand a native app a Blob, so an export arrives as a data
 * URI. The comma is the separator and it may legitimately appear in the
 * payload, so the *first* one is the only safe split point.
 */
export function decodeDataUri(uri: string): DecodedExport {
  if (!uri.startsWith('data:')) {
    throw new Error('That export is not a data: URI.');
  }

  const comma = uri.indexOf(',');
  if (comma === -1) {
    throw new Error('That data: URI has no payload.');
  }

  const header = uri.slice(5, comma);
  const payload = uri.slice(comma + 1);

  if (!header.endsWith(';base64')) {
    // The editor always base64-encodes. A URL-encoded payload would need
    // decodeURIComponent and a different write path, so refuse rather than
    // write something that is not the file.
    throw new Error('That export is not base64-encoded.');
  }

  const mimeType = header.slice(0, -';base64'.length) || 'application/octet-stream';
  const extension = mimeType.split('/')[1]?.replace('x-matroska', 'mkv').replace('quicktime', 'mov');

  return { base64: payload, mimeType, extension: extension ?? 'bin' };
}

/**
 * A filename that will not collide and will not need escaping.
 *
 * Timestamped rather than named after the project: a project name can contain a
 * slash, and two exports of the same project a minute apart must not overwrite
 * each other.
 */
export function exportFilename(format: ExportFormat, now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  return `snappedcut_${stamp}.${extensionFor(format)}`;
}

/** Is this something the editor can open? */
export function isSupportedSource(uriOrName: string): boolean {
  const lower = uriOrName.toLowerCase().split('?')[0] ?? '';
  return /\.(mp4|mov|m4v|webm|mkv|avi|zip|png|jpe?g|gif|json)$/.test(lower);
}
