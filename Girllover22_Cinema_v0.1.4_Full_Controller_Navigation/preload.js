const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cinemaAPI', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  getLibrary: () => ipcRenderer.invoke('library:get'),
  selectFolder: () => ipcRenderer.invoke('folder:select'),
  listDrives: () => ipcRenderer.invoke('drives:list'),
  scanFolders: () => ipcRenderer.invoke('scan:folders'),
  scanAllDrives: () => ipcRenderer.invoke('scan:all-drives'),
  cancelScan: () => ipcRenderer.invoke('scan:cancel'),
  showInFolder: (filePath) => ipcRenderer.invoke('path:show', filePath),
  toggleFullscreen: () => ipcRenderer.invoke('window:fullscreen'),
  onScanProgress: (callback) => ipcRenderer.on('scan-progress', (_event, data) => callback(data)),
  onScanComplete: (callback) => ipcRenderer.on('scan-complete', (_event, data) => callback(data)),
  onScanError: (callback) => ipcRenderer.on('scan-error', (_event, data) => callback(data))
});
