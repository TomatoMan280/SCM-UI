const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let serverProcess;
let logPath;

function sendUpdaterEvent(event, data) {
  const payload = JSON.stringify({ event, data: data || {} });
  const req = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/internal/updater-event',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    res.resume();
  });
  req.on('error', () => {
    // Fail silently when Express is not running/ready yet
  });
  req.write(payload);
  req.end();
}

function createWindow() {
  let iconPath = path.join(__dirname, 'build', 'icon.png');
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, 'dist', 'icon.png');
  }
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, 'icon.png');
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "SCMUI",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
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
  logPath = path.join(app.getPath('userData'), 'scmui-server-error.log');
  fs.writeFileSync(logPath, '--- App Startup ---\n');
  
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
    fs.appendFileSync(logPath, `[Server] ${output}\n`);
    
    // Handle local IPC commands
    if (output.includes('SCMUI_IPC:CHECK_UPDATE_NOW')) {
       console.log('[Main] Received check-update request from server.');
       autoUpdater.checkForUpdatesAndNotify().catch(err => {
         console.error('[Main] Manual update check failed:', err);
       });
    }
    if (output.includes('SCMUI_IPC:QUIT_AND_INSTALL')) {
       console.log('[Main] Received quit-and-install request from server.');
       autoUpdater.quitAndInstall();
    }

    if (output.includes('SCMUI_READY') || output.includes('Server running') || output.includes('127.0.0.1:3000')) {
       console.log('[Main] Server is ready. Loading app...');
       mainWindow.loadURL('http://127.0.0.1:3000').then(() => {
           mainWindow.webContents.openDevTools();
       });
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data}`);
    fs.appendFileSync(logPath, `[Server Error] ${data}\\n`);
  });

  serverProcess.on('error', (err) => {
    console.error('[Main] Failed to start server process:', err);
    fs.appendFileSync(logPath, `[Main Error] Failed to start server: ${err}\\n`);
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`[Main] Server process exited with code ${code}, signal ${signal}`);
    fs.appendFileSync(logPath, `[Main] Server process exited with code ${code}, signal ${signal}\\n`);
    if (code !== 0 && code !== null) {
      const { dialog } = require('electron');
      dialog.showErrorBox('SCMUI Server Crashed', `Server exited with code ${code}.\\nCheck logs at: ${logPath}`);
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level === 2 || level === 3) {
      fs.appendFileSync(logPath, `[Web Error] ${message} at ${sourceId}:${line}\\n`);
    }
  });

  mainWindow.webContents.on('did-fail-load', (e, errCode, errDesc) => {
    fs.appendFileSync(logPath, `[Web Fail Load] ${errCode} ${errDesc}\\n`);
    const { dialog } = require('electron');
    dialog.showErrorBox('Page failed to load', `Error ${errCode}: ${errDesc}\\nCheck logs at: ${logPath}`);
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

app.whenReady().then(() => {
  createWindow();
  
  // Configure custom logger for the autoUpdater to log to file and console
  autoUpdater.logger = {
    info(message) {
      console.log(`[Updater Log] ${message}`);
      if (logPath) {
        fs.appendFileSync(logPath, `[Updater Log] ${message}\n`);
      }
    },
    warn(message) {
      console.warn(`[Updater Warn] ${message}`);
      if (logPath) {
        fs.appendFileSync(logPath, `[Updater Warn] ${message}\n`);
      }
    },
    error(message) {
      console.error(`[Updater Error] ${message}`);
      if (logPath) {
        fs.appendFileSync(logPath, `[Updater Error] ${message}\n`);
      }
    }
  };
  
  // Allow updates to find packages published as Pre-releases on GitHub
  autoUpdater.allowPrerelease = true;

  const { dialog } = require('electron');

  autoUpdater.on('checking-for-update', () => {
    sendUpdaterEvent('checking');
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdaterEvent('available', info);
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available. It is being downloaded in the background.`
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendUpdaterEvent('not-available', info);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendUpdaterEvent('downloading', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdaterEvent('downloaded', info);
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'The new version has been downloaded. Restart the application to apply the updates.',
      buttons: ['Restart Now', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (err) => {
    sendUpdaterEvent('error', { message: err ? err.message : 'Unknown' });
    console.error('[Updater] Failed to verify updates:', err);
  });

  // Check for updates on startup
  console.log('[Updater] Checking for updates...');
  autoUpdater.checkForUpdatesAndNotify().catch(err => {
    console.error('[Updater] Check failed:', err);
  });
});

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
