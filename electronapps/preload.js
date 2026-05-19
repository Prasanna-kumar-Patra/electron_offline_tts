const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSamples: () => ipcRenderer.invoke('get-samples'),
  toggleMode: (mode) => ipcRenderer.invoke('toggle-mode', mode),
  startGeneration: (promptId) => ipcRenderer.send('start-generation', promptId),
  onLlmToken: (callback) => ipcRenderer.on('llm-token', (_event, value) => callback(value)),
  onTtsStatus: (callback) => ipcRenderer.on('tts-status', (_event, value) => callback(value)),
  onModeChanged: (callback) => ipcRenderer.on('mode-changed', (_event, value) => callback(value)),
  recognizeInk: (base64Image, type) => ipcRenderer.invoke('recognize-ink', base64Image, type)
});
