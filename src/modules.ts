/**
 * The Expo modules this package uses, typed by what it actually calls.
 *
 * Declared here rather than imported as `typeof import('expo-image-picker')`
 * for two reasons. They are *optional* peer dependencies, so a `typeof import`
 * would make the compiler demand them of anyone building this package. And
 * naming only the handful of members used means an Expo release that changes
 * something else cannot break the build.
 *
 * The import below is deliberately given a non-literal specifier, so the
 * compiler does not try to resolve a module that may not be installed.
 */

export type ImagePickerModule = {
  MediaTypeOptions: { Videos: unknown };
  UIImagePickerControllerQualityType: { High: unknown };
  requestMediaLibraryPermissionsAsync(): Promise<{ granted: boolean }>;
  launchImageLibraryAsync(options: Record<string, unknown>): Promise<{
    canceled: boolean;
    assets: Array<{ uri: string }> | null;
  }>;
};

export type DocumentPickerModule = {
  getDocumentAsync(options: Record<string, unknown>): Promise<{
    canceled: boolean;
    assets: Array<{ uri: string; name?: string }> | null;
  }>;
};

export type FileSystemModule = {
  documentDirectory: string | null;
  cacheDirectory: string | null;
  EncodingType: { Base64: string };
  writeAsStringAsync(
    uri: string,
    contents: string,
    options?: { encoding?: string },
  ): Promise<void>;
};

export type SharingModule = {
  isAvailableAsync(): Promise<boolean>;
  shareAsync(uri: string, options?: Record<string, unknown>): Promise<void>;
};

export type MediaLibraryModule = {
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  createAssetAsync(uri: string): Promise<unknown>;
};

/**
 * A lazy import whose failure says which package to install.
 *
 * Every Expo module here is optional, so the common mistake is a missing
 * install — and the default error for that is a bundler trace naming a path
 * inside node_modules rather than the thing to run.
 */
export async function importOrExplain<T>(name: string): Promise<T> {
  try {
    /* The specifier is a variable on purpose: a literal would be resolved at
       build time and fail for anyone who has not installed every optional
       module. Bundlers are told to leave it alone. */
    const specifier = name;
    return (await import(/* webpackIgnore: true */ /* @vite-ignore */ specifier)) as T;
  } catch (error) {
    throw new Error(`${name} is needed for this. Run: npx expo install ${name}`, {
      cause: error,
    });
  }
}
