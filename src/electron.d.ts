declare global {
  interface Window {
    motionViewer?: {
      chooseFiles: () => Promise<Array<{name: string; path: string; size: number; data: Uint8Array}>>;
      onFilesOpened: (callback: (files: Array<{name: string; path: string; size: number; data: Uint8Array}>) => void) => () => void;
      showInFinder: (filePath: string) => Promise<void>;
    };
  }
}
export {};
