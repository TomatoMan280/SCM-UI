import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine environments
const isProd = app.isPackaged || process.env.NODE_ENV === 'production';

// Set environment variables so the backend server understands it's in packaged desktop mode
process.env.NODE_ENV = 'production';
process.env.USER_DATA_PATH = app.getPath('userData');
process.env.APP_PATH = app.getAppPath();

console.log(`[Electron] Data Path (USER_DATA_PATH): ${process.env.USER_DATA_PATH}`);
console.log(`[Electron] Application Dir (APP_PATH): ${process.env.APP_PATH}`);

console.log('[Electron] Starting Express backend server...');
// Dynamically import the compiled ESM server bundle
import('./dist/server.js').catch((err) => {
  console.error('[Electron] Failed to load Express backend:', err);
});

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'Silhouette Card Maker',
    icon: path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Remove the default Electron window menu
  mainWindow.setMenu(null);

  // Load the application URL after a short delay for the express server to boot
  const loadApp = () => {
    mainWindow.loadURL('http://localhost:3000').catch((err) => {
      console.log('[Electron] Server not fully ready, retrying in 1s...');
      setTimeout(loadApp, 1000);
    });
  };

  setTimeout(loadApp, 500);

  // Enable DevTools if DEBUG_ELECTRON environment variable is provided
  if (process.env.DEBUG_ELECTRON === 'true' || !app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
