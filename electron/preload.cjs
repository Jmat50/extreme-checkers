const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('editorApi', {
  saveConfig: (json) => ipcRenderer.invoke('editor:save-config', json),
});

ipcRenderer.on('editor:save-request', () => {
  window.dispatchEvent(new CustomEvent('editor:save-request'));
});
