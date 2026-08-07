const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld('electronAPI', {
    ping: () => ipcRenderer.invoke('ping'),
    restoreMain: () => ipcRenderer.send('restore-main'),
    closeApp: () => ipcRenderer.send('close-app')
});
