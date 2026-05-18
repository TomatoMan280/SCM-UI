const { app, BrowserWindow, utilityProcess } = require('electron');
const path = require('path');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "SCMUI",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the built app directly
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  mainWindow.loadFile(indexPath).catch(err => {
    console.error("Failed to load index.html:", err);
  });

  // Start the Express server as a background service
  const serverPath = path.join(__dirname, 'dist', 'server.cjs');
  const appPath = app.getAppPath();
  
  const launchServer = () => {
    try {
      serverProcess = utilityProcess.fork(serverPath, [], {
        cwd: appPath,
        env: { 
          ...process.env, 
          PORT: '3000', 
          NODE_ENV: 'production',
          APP_USER_DATA: app.getPath('userData'),
          APP_PATH: appPath,
          ELECTRON_RUN_AS_NODE: '1'
        },
        stdio: 'pipe'
      });

      serverProcess.stdout.on('data', (data) => {
        process.stdout.write(`[Server] ${data}`);
      });
      
      serverProcess.stderr.on('data', (data) => {
        process.stderr.write(`[Server Error] ${data}`);
      });

      serverProcess.on('exit', (code) => {
        console.log(`Server process exited with code ${code}`);
        if (code !== 0 && code !== null) {
          setTimeout(launchServer, 5000);
        }
      });
    } catch (err) {
      console.error("Failed to launch server process:", err);
    }
  };

  launchServer();

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
