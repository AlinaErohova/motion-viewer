declare global {
  interface Window {
    motionViewer?: {
      chooseFiles: () => Promise<Array<{name: string; path: string; size: number; data: Uint8Array}>>;
      onFilesOpened: (callback: (files: Array<{name: string; path: string; size: number; data: Uint8Array}>) => void) => () => void;
      exportFiles: (request: {
        items: Array<{name: string; data: Uint8Array}>;
        format: 'json' | 'lottie';
        size: 'original' | 'custom';
        width?: number;
        height?: number;
      }) => Promise<{canceled: boolean; count: number; directory?: string}>;
      showInFinder: (filePath: string) => Promise<void>;
    };
  }
}
export {};
