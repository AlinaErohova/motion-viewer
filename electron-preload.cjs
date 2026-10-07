const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('motionViewer', {
  chooseFiles: () => ipcRenderer.invoke('files:choose'),
  onFilesOpened: (callback) => {
    const listener = (_event, files) => callback(files);
    ipcRenderer.on('files:opened', listener);
    return () => ipcRenderer.removeListener('files:opened', listener);
  },
  exportFiles: (request) => ipcRenderer.invoke('files:export', request),
  showInFinder: (filePath) => ipcRenderer.invoke('app:show-in-finder', filePath),
});
