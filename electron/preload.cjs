const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getZoomFactor: () => ipcRenderer.invoke('get-zoom-factor'),
  setZoomFactor: (factor) => ipcRenderer.invoke('set-zoom-factor', factor),
  zoomIn: () => ipcRenderer.invoke('zoom-in'),
  zoomOut: () => ipcRenderer.invoke('zoom-out'),
  resetZoom: () => ipcRenderer.invoke('reset-zoom'),
  onZoomChanged: (callback) => {
    const handler = (_event, factor) => callback(factor);
    ipcRenderer.on('zoom-changed', handler);
    return () => {
      ipcRenderer.removeListener('zoom-changed', handler);
    };
  },
  minimize: () => ipcRenderer.invoke('minimize-window'),
  maximize: () => ipcRenderer.invoke('maximize-window'),
  close: () => ipcRenderer.invoke('close-window'),
  isMaximized: () => ipcRenderer.invoke('is-window-maximized'),
  onMaximizeChanged: (callback) => {
    const handler = (_event, isMax) => callback(isMax);
    ipcRenderer.on('window-maximized-changed', handler);
    return () => {
      ipcRenderer.removeListener('window-maximized-changed', handler);
    };
  },
});
