const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const isDev = !app.isPackaged;
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

if (app.isPackaged) {
  app.setPath('userData', path.join(app.getPath('temp'), 'extreme-checkers-editor'));
}

function distPath(...segments) {
  return path.join(app.getAppPath(), 'dist', ...segments);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: 'Extreme Checkers Editor',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once('ready-to-show', () => win.show());

  win.webContents.on('did-fail-load', (_event, code, description, url) => {
    dialog.showErrorBox(
      'Failed to load editor',
      `${description} (${code})\n${url ?? ''}`,
    );
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    dialog.showErrorBox('Editor crashed', JSON.stringify(details, null, 2));
  });

  if (isDev) {
    void win.loadURL(`${DEV_URL}/editor.html`);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const editorHtml = distPath('editor.html');
    if (!fs.existsSync(editorHtml)) {
      dialog.showErrorBox(
        'Missing editor files',
        `Could not find:\n${editorHtml}`,
      );
      return;
    }
    void win.loadFile(editorHtml);
  }

  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Save Config…',
          accelerator: 'Ctrl+S',
          click: () => win.webContents.send('editor:save-request'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'viewMenu' },
  ]);
  Menu.setApplicationMenu(menu);
}

ipcMain.handle('editor:save-config', async (_event, json) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save game configuration',
    defaultPath: 'gameConfig.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return null;
  fs.writeFileSync(filePath, json, 'utf8');
  return filePath;
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
