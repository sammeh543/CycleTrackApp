const { app, BrowserWindow } = require('electron');
const { exec } = require('child_process');
const path = require('path');

let mainWindow;
let serverProcess;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Wait a bit for the Vite dev server to start, then load the local web app
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:5000');
  }, 2000);

  mainWindow.on('closed', function () {
    mainWindow = null;
    if (serverProcess) serverProcess.kill();
  });
}

app.on('ready', () => {
  // Start your dev server (frontend + backend)
  serverProcess = exec('npm run dev', { cwd: __dirname });

  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
  if (serverProcess) serverProcess.kill();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// Update app name for Electron (if shown in dock/taskbar)
app.setName('CycleSense');