const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "SCMUI",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load a simple loading message first
  mainWindow.loadURL(`data:text/html;charset=utf-8,
    <body style="background: #111; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
      <div style="text-align: center;">
        <h1 style="margin-bottom: 20px;">SCMUI</h1>
        <p>Initializing local engine...</p>
        <div style="margin-top: 20px; width: 40px; height: 40px; border: 4px solid #333; border-top: 4px solid #fff; border-radius: 50%; display: inline-block; animation: spin 1s linear infinite;"></div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
      </div>
    </body>
  `);

  // Start the Express server
  // When packaged, server.cjs is in dist folder inside resources/app.asar
  const serverPath = path.join(__dirname, 'dist', 'server.cjs');
  
  // Use fork instead of spawn to ensure it runs with the same node version
  serverProcess = fork(serverPath, [], {
    env: { 
      ...process.env, 
      PORT: '3000', 
      NODE_ENV: 'production',
      USER_DATA_PATH: app.getPath('userData'),
      APP_PATH: app.getAppPath()
    },
    stdio: 'pipe' // Listen to pipe to catch logs
  });

  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Server] ${output}`);
    if (output.includes('SCMUI_READY') || output.includes('Server running') || output.includes('127.0.0.1:3000')) {
       console.log('[Main] Server is ready. Loading app...');
       mainWindow.loadURL('http://127.0.0.1:3000');
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data}`);
  });

  serverProcess.on('error', (err) => {
    console.error('[Main] Failed to start server process:', err);
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`[Main] Server process exited with code ${code}, signal ${signal}`);
  });

  // Fallback if we miss the console log or it's quiet
  const timeoutId = setTimeout(() => {
    if (mainWindow && !mainWindow.getURL().includes('127.0.0.1:3000')) {
      console.log('[Main] 10s timeout reached, attempting fallback load...');
      mainWindow.loadURL('http://127.0.0.1:3000').catch(err => {
        console.error('[Main] Failed fallback load:', err);
      });
    }
  }, 10000);

  mainWindow.on('closed', () => {
    mainWindow = null;
    clearTimeout(timeoutId);
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
