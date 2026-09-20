const { app, BrowserWindow, BrowserView, Menu, ipcMain } = require('electron');
const path = require('path');

const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;

let mainWindow = null;
let browserView = null;

function getTargetWebContents() {
  if (browserView && !browserView.webContents.isDestroyed()) {
    return browserView.webContents;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow.webContents;
  }
  return null;
}

function clampZoom(factor) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(factor * 100) / 100));
}

function setZoom(factor) {
  const wc = getTargetWebContents();
  if (!wc) return 1.0;
  const clamped = clampZoom(factor);
  wc.setZoomFactor(clamped);
  wc.send('zoom-changed', clamped);
  return clamped;
}

function stepZoom(direction) {
  const wc = getTargetWebContents();
  if (!wc) return 1.0;
  const current = wc.getZoomFactor();
  let next;
  if (direction > 0) {
    next = ZOOM_STEPS.find((step) => step > current + 0.01) ?? MAX_ZOOM;
  } else {
    next = [...ZOOM_STEPS].reverse().find((step) => step < current - 0.01) ?? MIN_ZOOM;
  }
  return setZoom(next);
}

function resetZoom() {
  return setZoom(1.0);
}

function createMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: '編輯 (Edit)',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: '檢視 (View)',
      submenu: [
        {
          label: '放大 (Zoom In)',
          accelerator: 'CmdOrCtrl+=',
          click: () => stepZoom(1),
        },
        {
          label: '縮小 (Zoom Out)',
          accelerator: 'CmdOrCtrl+-',
          click: () => stepZoom(-1),
        },
        {
          label: '實際大小 (Actual Size)',
          accelerator: 'CmdOrCtrl+0',
          click: () => resetZoom(),
        },
        { type: 'separator' },
        {
          role: 'reload',
          click: () => {
            const wc = getTargetWebContents();
            wc?.reload();
          },
        },
        {
          role: 'forceReload',
          click: () => {
            const wc = getTargetWebContents();
            wc?.reloadIgnoringCache();
          },
        },
        {
          label: '開發人員工具 (Toggle DevTools)',
          accelerator: 'F12',
          click: () => {
            const wc = getTargetWebContents();
            wc?.toggleDevTools();
          },
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: '視窗 (Window)',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function updateViewBounds() {
  if (!mainWindow || mainWindow.isDestroyed() || !browserView) return;
  const [width, height] = mainWindow.getContentSize();
  browserView.setBounds({ x: 0, y: 0, width, height });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 500,
    minHeight: 500,
    title: 'Teams Chat Demo',
    backgroundColor: '#ececf3',
    frame: false,
  });

  browserView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  mainWindow.setBrowserView(browserView);
  browserView.setAutoResize({ width: true, height: true });
  updateViewBounds();

  mainWindow.on('resize', updateViewBounds);

  browserView.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      browserView.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  createMenu();

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    browserView.webContents.loadURL(devUrl);
  } else {
    browserView.webContents.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    browserView = null;
    mainWindow = null;
  });
}

// Register IPC handlers
ipcMain.handle('get-zoom-factor', () => {
  const wc = getTargetWebContents();
  return wc ? wc.getZoomFactor() : 1.0;
});

ipcMain.handle('set-zoom-factor', (_event, factor) => {
  return setZoom(factor);
});

ipcMain.handle('zoom-in', () => {
  return stepZoom(1);
});

ipcMain.handle('zoom-out', () => {
  return stepZoom(-1);
});

ipcMain.handle('reset-zoom', () => {
  return resetZoom();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
