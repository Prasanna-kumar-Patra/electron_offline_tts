const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { MockService } = require('./mock-service');
const { LlmService } = require('./llm-service');

let mainWindow;
const mockService = new MockService();
const llmService = new LlmService();

// State
let isLocalMode = false; // Default to mock mode since no models are present

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false,
    backgroundColor: '#0f172a' // Dark mode background
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('get-samples', () => {
  return mockService.getSamples();
});

ipcMain.handle('toggle-mode', async (event, mode) => {
  if (mode && !llmService.isReady) {
    const success = await llmService.init();
    if (!success) {
      return false; // Tell UI it couldn't be enabled
    }
  }
  isLocalMode = mode;
  return isLocalMode;
});

ipcMain.on('start-generation', async (event, promptId) => {
  let promptText = '';
  
  if (isLocalMode && llmService.isReady) {
    const samples = mockService.getSamples();
    const sample = samples.find(s => s.id === promptId);
    if (sample) promptText = sample.prompt;
    else promptText = promptId; // In case they type something
    
    // Proceed with Real Local Model
    await llmService.generateStream(promptText, 
      (token) => {
        if (!mainWindow.isDestroyed()) mainWindow.webContents.send('llm-token', token);
      },
      (sentence) => {
        // Still using mock TTS for now to avoid dropping gigabytes of Kokoro ONNX
        mockService.speak(sentence, 
          () => {
            if (!mainWindow.isDestroyed()) mainWindow.webContents.send('tts-status', { status: 'speaking', text: sentence });
          },
          () => {
            if (!mainWindow.isDestroyed()) mainWindow.webContents.send('tts-status', { status: 'idle' });
          }
        );
      }
    );
  } else {
    if (isLocalMode) {
      if (!mainWindow.isDestroyed()) mainWindow.webContents.send('llm-token', '\n[System: Local models missing or failed to load. Falling back to Mock.]\n\n');
      isLocalMode = false;
      if (!mainWindow.isDestroyed()) mainWindow.webContents.send('mode-changed', false);
    }

    // Proceed with Mock Mode
    mockService.generateStream(promptId, 
      (token) => {
        if (!mainWindow.isDestroyed()) mainWindow.webContents.send('llm-token', token);
      },
      (sentence) => {
        mockService.speak(sentence, 
          () => {
            if (!mainWindow.isDestroyed()) mainWindow.webContents.send('tts-status', { status: 'speaking', text: sentence });
          },
          () => {
            if (!mainWindow.isDestroyed()) mainWindow.webContents.send('tts-status', { status: 'idle' });
          }
        );
      }
    );
  }
});
