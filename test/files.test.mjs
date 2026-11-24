import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeDataUri, exportFilename, extensionFor, isSupportedSource, mimeFor,
} from '../dist/files.js';

test('a base64 data URI splits into something writable', () => {
  const { base64, mimeType, extension } = decodeDataUri('data:video/mp4;base64,AAAA');
  assert.equal(base64, 'AAAA');
  assert.equal(mimeType, 'video/mp4');
  assert.equal(extension, 'mp4');
});

test('only the first comma splits: base64 payloads contain commas', () => {
  // A later comma is payload, not a separator. Splitting on the wrong one
  // writes a truncated file that still looks like a file.
  const { base64 } = decodeDataUri('data:video/mp4;base64,AAAA,BBBB,CCCC');
  assert.equal(base64, 'AAAA,BBBB,CCCC');
});

test('matroska and quicktime map to the extensions people expect', () => {
  assert.equal(decodeDataUri('data:video/x-matroska;base64,AA').extension, 'mkv');
  assert.equal(decodeDataUri('data:video/quicktime;base64,AA').extension, 'mov');
});

test('a non-data URI is refused rather than written', () => {
  assert.throws(() => decodeDataUri('file:///tmp/out.mp4'), /not a data: URI/);
  assert.throws(() => decodeDataUri('https://x/out.mp4'), /not a data: URI/);
});

test('a data URI with no payload is refused', () => {
  assert.throws(() => decodeDataUri('data:video/mp4;base64'), /no payload/);
});

test('a URL-encoded payload is refused rather than written as if it were base64', () => {
  // Writing this with a base64 encoding would produce a file of the wrong bytes.
  assert.throws(() => decodeDataUri('data:video/mp4,%00%01'), /not base64/);
});

test('a data URI with no mime type still decodes to a default', () => {
  assert.equal(decodeDataUri('data:;base64,AAAA').mimeType, 'application/octet-stream');
});

test('every format has a mime type and an extension', () => {
  for (const format of ['webm', 'mp4', 'mkv', 'mov', 'gif', 'png']) {
    assert.match(mimeFor(format), /^(video|image)\//, format);
    assert.equal(extensionFor(format), format);
  }
});

test('an export filename is timestamped, safe, and carries the format', () => {
  const name = exportFilename('mp4', new Date('2026-11-24T05:06:07.890Z'));
  assert.equal(name, 'snappedcut_2026-11-24_05-06-07.mp4');
  // No colon, dot-before-extension, or slash: all three break a file path or a
  // gallery import on at least one platform.
  assert.ok(!name.includes(':'));
  assert.ok(!name.includes('/'));
  assert.equal(name.split('.').length, 2);
});

test('two exports a second apart do not collide', () => {
  const a = exportFilename('mp4', new Date('2026-11-24T05:06:07Z'));
  const b = exportFilename('mp4', new Date('2026-11-24T05:06:08Z'));
  assert.notEqual(a, b);
});

test('supported sources are recognised, and query strings do not fool it', () => {
  for (const good of ['clip.mp4', 'a/b/MOVIE.MOV', 'project.zip', 'sticker.json',
                      'file:///x/clip.webm?token=abc']) {
    assert.equal(isSupportedSource(good), true, good);
  }
  for (const bad of ['notes.txt', 'archive.tar.gz', 'script.sh', 'clip.mp4.exe', '']) {
    assert.equal(isSupportedSource(bad), false, bad);
  }
});
