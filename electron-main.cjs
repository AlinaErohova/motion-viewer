const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { convertAnimation } = require('./lottie-export.cjs');

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

async function uniquePath(directory, filename) {
  const extension = path.extname(filename);
  const base = path.basename(filename, extension);
  let candidate = path.join(directory, filename);
  let index = 1;
  while (true) {
    try {
      await fs.access(candidate);
      candidate = path.join(directory, `${base} (${index++})${extension}`);
    } catch {
      return candidate;
    }
  }
}

async function exportFiles(request) {
  const items = Array.isArray(request?.items) ? request.items : [];
  if (!items.length) throw new Error('No animations selected for export.');
  if (!['json', 'lottie'].includes(request.format)) throw new Error('Unsupported export format.');
  if (!['original', 'custom'].includes(request.size)) throw new Error('Unsupported export size.');

  const converted = items.map((item) => convertAnimation(item, request));

  if (converted.length === 1) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export animation',
      defaultPath: converted[0].name,
      filters: [{
        name: request.format === 'json' ? 'Lottie JSON' : 'dotLottie',
        extensions: [request.format],
      }],
    });
    if (result.canceled || !result.filePath) return { canceled: true, count: 0 };
    await fs.writeFile(result.filePath, converted[0].data);
    return { canceled: false, count: 1, directory: path.dirname(result.filePath) };
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: `Export ${converted.length} animations`,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true, count: 0 };

  const directory = result.filePaths[0];
  for (const item of converted) {
    const destination = await uniquePath(directory, item.name);
    await fs.writeFile(destination, item.data);
  }
  return { canceled: false, count: converted.length, directory };
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

  ipcMain.handle('files:export', (_event, request) => exportFiles(request));

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
