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

export default function Editor() {
  const canvas = useRef<SnappedCutCanvasHandle>(null);
  const pick = useVideoPicker(canvas);

  return (
    <View style={{ flex: 1 }}>
      <SnappedCutCanvas
        ref={canvas}
        publishableKey="pk_live_..."
        onExport={(result) => shareExport(result)}
      />
      <Button title="Pick a video" onPress={pick} />
      <Button title="Export" onPress={() => canvas.current?.export('mp4')} />
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
| `saveExport(result, { filename? })` | Write an export to the app's documents. Returns the file URI. |
| `shareExport(result)` | Save, then open the share sheet. |
| `saveExportToLibrary(result)` | Save into the camera roll. |

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

## The editing happens on the handset

Decode, cut, filter and encode are WebCodecs calls **inside the WebView**. So
`load` and `export` need no network once the view is up, and the footage never
leaves the device. The one exception is a **cloud render**, which is opt-in,
costs credits, and reports itself through `onJob`.

MIT
