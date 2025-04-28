const { app, BrowserWindow } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const http = require('http');

let mainWindow;
let serverProcess;

function createSplashWindow () {
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    resizable: false,
    show: true,
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));
  return splash;
}

function waitForServerReady (url, timeout = 20000, interval = 500) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      http.get(url, (res) => {
        if (res.statusCode === 200) resolve();
        else retry();
      }).on('error', retry);
    }
    function retry() {
      if (Date.now() - start > timeout) reject(new Error('Server did not start in time'));
      else setTimeout(check, interval);
    }
    check();
  });
}

function createMainWindow () {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    icon: path.join(__dirname, 'attached_assets/Crescent Moon and Shining Star.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });
  mainWindow.loadURL('http://localhost:5000');
  mainWindow.on('closed', function () {
    mainWindow = null;
    if (serverProcess) serverProcess.kill();
  });
}

app.on('ready', async () => {
  // Start your dev server (frontend + backend)
  serverProcess = exec('npm run dev', { cwd: __dirname });
  const splash = createSplashWindow();
  try {
    await waitForServerReady('http://localhost:5000');
    await new Promise(res => setTimeout(res, 1000)); // 1 second artificial delay
    splash.close();
    createMainWindow();
  } catch (e) {
    splash.webContents.executeJavaScript(`document.querySelector('p').textContent = 'Failed to start server.'`);
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
  if (serverProcess) serverProcess.kill();
});

app.on('activate', function () {
  if (mainWindow === null) createMainWindow();
});