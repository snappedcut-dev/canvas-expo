# @snappedcut/canvas-expo

The [Snapped Cut](https://snappedcut.com) video editor in an Expo app: the
canvas, plus the pickers and the save paths an Expo app actually needs.

> **Status: the wrapper is ready, the host route is not.** This package is
> complete and tested, but `snappedcut.com/embed` is not serving frames yet and
> publishable keys are not being issued. **It will not load against production
> today.**

```sh
npx expo install @snappedcut/canvas-expo react-native-webview
npx expo install expo-image-picker expo-file-system expo-sharing   # as needed
```

```tsx
import { useRef } from 'react';
import { Button, View } from 'react-native';
import {
  SnappedCutCanvas, useVideoPicker, shareExport,
  type SnappedCutCanvasHandle,
} from '@snappedcut/canvas-expo';

export default function Editor({ token }: { token: string }) {
  const canvas = useRef<SnappedCutCanvasHandle>(null);
  const pick = useVideoPicker(canvas);

  const exportAndShare = async () => {
    // Your server presigns a PUT and a GET for one object in your bucket.
    const { putUrl, getUrl } = await fetch('https://example.com/api/upload-slot').then((r) => r.json());
    await canvas.current?.export('mp4', { uploadUrl: putUrl });
    await shareExport(getUrl, 'mp4');
  };

  return (
    <View style={{ flex: 1 }}>
      <SnappedCutCanvas ref={canvas} publishableKey="pk_live_..." token={token} />
      <Button title="Pick a video" onPress={pick} />
      <Button title="Export" onPress={exportAndShare} />
    </View>
  );
}
```

The canvas, its props and its ref are
[`@snappedcut/canvas-react-native`](https://github.com/snappedcut-dev/canvas-react-native)
and re-exported here unchanged. What this package adds:

| | |
| --- | --- |
| `pickVideo()` | Media-library picker. `null` if declined or cancelled. |
| `pickProject()` | Document picker, refusing anything the editor cannot open. |
| `useVideoPicker(ref)` | Pick a video and load it, in one callback. |
| `saveExport(url, format, { filename? })` | Download an uploaded export (its https URL) into the app's documents. Returns the file URI. |
| `shareExport(url, format)` | Save, then open the share sheet. |
| `saveExportToLibrary(url, format)` | Save into the camera roll. |

## Why the save path is its own module

An export arrives as a **`data:` URI**, because a WebView cannot hand a native
app a Blob. Turning that into a file has three ways to go wrong that all still
produce a file:

- **Splitting on the wrong comma.** Base64 payloads contain commas, so only the
  *first* one is the separator. Splitting later writes a truncated video that
  still opens a file manager and still fails in a player.
- **Assuming base64.** A URL-encoded payload written with a base64 encoding is
  the wrong bytes, silently.
- **The extension.** `video/x-matroska` is `.mkv` and `video/quicktime` is
  `.mov`; the mime subtype is not the extension, and a gallery import rejects
  the mismatch hours later.

All of it lives in `src/files.ts`, which is pure and covered by tests — no
simulator needed. Filenames are timestamped rather than named after the
project, because a project name can contain a slash and two exports a minute
apart must not overwrite each other.

## The Expo modules are optional

Every `expo-*` module is an optional peer, imported lazily and **by name**, so
an app that only loads projects from its own server never installs a picker.
A missing one fails with the command to run rather than a bundler trace naming
a path inside `node_modules`.

## Where the processing runs

Editing runs in the WebView, on the device. **`export` renders on Snapped
Cut's servers**, billed to the token's session. Export with `{ uploadUrl }` so
that the WebView uploads the file to your storage. Then pass its https URL to
`saveExport`, `shareExport` or `saveExportToLibrary`. A `blob:` URI from an
export without `uploadUrl` is readable only inside the WebView.

MIT
