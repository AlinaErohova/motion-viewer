const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

let mainWindow;
let pendingPaths = [];

function normalizePaths(paths) {
  return (paths || []).filter((p) => /\.(json|lottie)$/i.test(p));
}

async function filesForPaths(paths) {
  const valid = normalizePaths(paths);
  return Promise.all(valid.map(async (filePath) => {
    const stat = await fs.stat(filePath);
    const data = await fs.readFile(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stat.size,
      data,
    };
  }));
}

async function sendPaths(paths) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const files = await filesForPaths(paths);
  if (files.length) mainWindow.webContents.send('files:opened', files);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1050,
    minHeight: 700,
    title: 'Motion Viewer',
    backgroundColor: '#111111',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (pendingPaths.length) {
      const paths = pendingPaths;
      pendingPaths = [];
      sendPaths(paths);
    }
  });

  const isDev = process.env.ELECTRON_DEV === '1';
  if (isDev) mainWindow.loadURL('http://localhost:5173');
  else mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  ipcMain.handle('files:choose', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Lottie animations', extensions: ['json', 'lottie'] }],
    });
    if (result.canceled) return [];
    return filesForPaths(result.filePaths);
  });

  ipcMain.handle('app:show-in-finder', (_event, filePath) => shell.showItemInFolder(filePath));
  createWindow();
});

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (!app.isReady()) pendingPaths.push(filePath);
  else sendPaths([filePath]);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
