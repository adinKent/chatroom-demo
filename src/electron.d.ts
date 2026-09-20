export interface ElectronAPI {
  isElectron: boolean;
  getZoomFactor: () => Promise<number>;
  setZoomFactor: (factor: number) => Promise<number>;
  zoomIn: () => Promise<number>;
  zoomOut: () => Promise<number>;
  resetZoom: () => Promise<number>;
  onZoomChanged: (callback: (factor: number) => void) => () => void;
  minimize: () => Promise<void>;
  maximize: () => Promise<boolean>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onMaximizeChanged: (callback: (isMax: boolean) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
