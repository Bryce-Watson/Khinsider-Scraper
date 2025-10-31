const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    searchAlbum: (url) => ipcRenderer.invoke('search-album', url),
    downloadTracks: (url, trackIndices, outputDir) => 
        ipcRenderer.invoke('download-tracks', { url, trackIndices, outputDir }),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    
    // Event listeners
    onDownloadProgress: (callback) => {
        ipcRenderer.on('download-progress', (event, data) => callback(data));
    },
    onDownloadStart: (callback) => {
        ipcRenderer.on('download-start', (event, data) => callback(data));
    },
    onDownloadWarning: (callback) => {
        ipcRenderer.on('download-warning', (event, data) => callback(data));
    }
});