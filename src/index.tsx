/**
 * The Snapped Cut editor for Expo.
 *
 * The canvas itself is `@snappedcut/canvas-react-native` — this package adds
 * the two things an Expo app needs around it and that are awkward to write
 * twice: getting a video *in* from the device, and getting an export *out* to
 * the camera roll or a share sheet.
 */
import { useCallback } from 'react';
import type { RefObject } from 'react';
import type { ExportFormat, ExportResult } from '@snappedcut/canvas-react-native';

import { decodeDataUri, exportFilename, isSupportedSource, mimeFor } from './files.js';
import {
  importOrExplain,
  type DocumentPickerModule,
  type FileSystemModule,
  type ImagePickerModule,
  type MediaLibraryModule,
  type SharingModule,
} from './modules.js';

export {
  CanvasError,
  SnappedCutCanvas,
  type ExportFormat,
  type ExportResult,
  type JobEvent,
  type SnappedCutCanvasHandle,
  type SnappedCutCanvasProps,
} from '@snappedcut/canvas-react-native';

export {
  decodeDataUri,
  exportFilename,
  extensionFor,
  isSupportedSource,
  mimeFor,
  type DecodedExport,
} from './files.js';

/** Ask the user for a video. Resolves with `null` if they decline or cancel. */
export async function pickVideo(): Promise<string | null> {
  const picker = await importOrExplain<ImagePickerModule>('expo-image-picker');

  const granted = await picker.requestMediaLibraryPermissionsAsync();
  if (!granted.granted) return null;

  const result = await picker.launchImageLibraryAsync({
    mediaTypes: picker.MediaTypeOptions.Videos,
    allowsMultipleSelection: false,
    /* The editor re-encodes anyway, so a transcode here would cost the user a
       wait and a generation of quality for nothing. */
    videoQuality: picker.UIImagePickerControllerQualityType.High,
  });

  if (result.canceled) return null;
  return result.assets?.[0]?.uri ?? null;
}

/** Ask the user for a project bundle or any supported file. */
export async function pickProject(): Promise<string | null> {
  const picker = await importOrExplain<DocumentPickerModule>('expo-document-picker');

  const result = await picker.getDocumentAsync({ copyToCacheDirectory: true });
  if (result.canceled) return null;

  const asset = result.assets?.[0];
  if (!asset) return null;
  if (!isSupportedSource(asset.name ?? asset.uri)) {
    throw new Error(`The editor cannot open ${asset.name ?? 'that file'}.`);
  }
  return asset.uri;
}

/**
 * Write an export to the app's document directory and return its file URI.
 *
 * The export arrives as a data URI because a WebView cannot hand a native app a
 * Blob, so this is the step that turns it into a real file.
 */
export async function saveExport(
  result: ExportResult,
  options: { filename?: string } = {},
): Promise<string> {
  const fs = await importOrExplain<FileSystemModule>('expo-file-system');

  const { base64 } = decodeDataUri(result.uri);
  const name = options.filename ?? exportFilename(result.format);
  const directory = fs.documentDirectory ?? fs.cacheDirectory;
  if (!directory) throw new Error('This platform has no writable directory.');

  const uri = `${directory}${name}`;
  await fs.writeAsStringAsync(uri, base64, { encoding: fs.EncodingType.Base64 });
  return uri;
}

/** Save an export, then offer it to the share sheet. */
export async function shareExport(result: ExportResult): Promise<string> {
  const uri = await saveExport(result);
  const sharing = await importOrExplain<SharingModule>('expo-sharing');

  if (await sharing.isAvailableAsync()) {
    await sharing.shareAsync(uri, { mimeType: mimeFor(result.format) });
  }
  return uri;
}

/** Save an export into the device's camera roll. */
export async function saveExportToLibrary(result: ExportResult): Promise<string> {
  const uri = await saveExport(result);
  const library = await importOrExplain<MediaLibraryModule>('expo-media-library');

  const granted = await library.requestPermissionsAsync();
  if (!granted.granted) throw new Error('No permission to write to the media library.');

  await library.createAssetAsync(uri);
  return uri;
}

/** Convenience for the common case: pick a video, then load it. */
export function useVideoPicker(
  canvas: RefObject<{ load(uri: string): Promise<void> } | null>,
): () => Promise<void> {
  return useCallback(async () => {
    const uri = await pickVideo();
    if (uri) await canvas.current?.load(uri);
  }, [canvas]);
}
