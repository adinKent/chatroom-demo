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
});

