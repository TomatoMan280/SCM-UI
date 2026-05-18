const { app, BrowserWindow, utilityProcess } = require('electron');
const path = require('path');

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
  
  // Use utilityProcess for a more stable Node.js process in Electron production
  try {
    serverProcess = utilityProcess.fork(serverPath, [], {
      cwd: appPath,
      env: { 
        ...process.env, 
        PORT: '3000', 
        NODE_ENV: 'production',
        APP_USER_DATA: app.getPath('userData'),
        APP_PATH: appPath
      },
      stdio: 'pipe'
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data}`);
      const output = data.toString();
      if (output.includes('Server running') || output.includes('localhost:3000')) {
         if (mainWindow && !mainWindow.isDestroyed()) {
           mainWindow.loadURL('http://localhost:3000');
         }
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data}`);
    });

    serverProcess.on('exit', (code) => {
      console.log(`Server process exited with code ${code}`);
    });
  } catch (err) {
    console.error("Failed to launch utilityProcess, falling back to fork:", err);
    const { fork } = require('child_process');
    serverProcess = fork(serverPath, [], {
      cwd: appPath,
      env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
      silent: true
    });
    
    serverProcess.stdout.on('data', (data) => {
       if (data.toString().includes('localhost:3000')) {
         mainWindow.loadURL('http://localhost:3000');
       }
    });
  }

  // Fallback if we miss the console log
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.getURL()) {
      mainWindow.loadURL('http://localhost:3000');
    }
  }, 5000);

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
