const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Silhouette Card Maker",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Start the Express server
  // When bundled, __dirname points to the folder containing electron-main.cjs
  // We need to resolve dist/server.cjs
  const serverPath = path.join(__dirname, 'dist', 'server.cjs');
  const appPath = app.getAppPath();
  
  // Use fork instead of spawn to use the internal Electron node runtime
  serverProcess = fork(serverPath, [], {
    cwd: appPath,
    env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
    silent: true // This allows us to pipe stdout/stderr
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
    const output = data.toString();
    if (output.includes('Server running') || output.includes('localhost:3000')) {
       // Load the local express server once it's up
       if (mainWindow) mainWindow.loadURL('http://localhost:3000');
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  // Fallback if we miss the console log
  setTimeout(() => {
    if (mainWindow && !mainWindow.getURL()) {
      mainWindow.loadURL('http://localhost:3000');
    }
  }, 3500);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
