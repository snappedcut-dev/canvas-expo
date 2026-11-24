# Changelog

Every release is tagged and published from CI with npm provenance. Versions
follow semver; the embed protocol has its own version in the `ready` event.

## 0.2.0 - 2026-11-24

### Fixed

- **`saveExport` failed on every export.** It decoded a `data:` URI, but the
  editor now hands back a `blob:` URI, which only the WebView can read.
  Export with `{ uploadUrl }` instead, then pass the uploaded file's https
  URL: `saveExport(url, format)`, `shareExport(url, format)` and
  `saveExportToLibrary(url, format)` download it. A `blob:` URI is refused with
  that fix in the error message.

### Changed

- Requires `@snappedcut/canvas-react-native` ^0.2.0, which adds features,
  the full theme set, `setTheme`, `uploadUrl` and the new error codes.
- `gif` and `png` were removed. The server renders `mp4`, `webm`, `mov` and
  `mkv`.

## 0.1.1 - 2026-11-24

### Fixed

- **Documentation said the processing runs on our servers. It does not, yet.**
  Decode, compositing and encode run on the device today, on WebCodecs. The
  previous wording described the committed direction as though it had shipped,
  which is the wrong thing to hand anyone writing a privacy policy: it would
  have claimed media is uploaded to us when it is not. The section now states
  what this version does, names cloud render as the one path that uploads
  anything, and says the browser path means a real first load and a WebCodecs
  floor.

## 0.1.0 - 2026-11-24

First publish. The protocol and the client are complete and tested; the host
route at `snappedcut.com/embed` is not serving yet, so this will not mount
against production. See the status note in the README.

