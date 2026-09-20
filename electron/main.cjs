const { app, BrowserWindow, BrowserView, Menu, ipcMain } = require('electron');
const path = require('path');

const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;

let mainWindow = null;
let mainView = null;
let controlsView = null;

const CONTROLS_WIDTH = 136;
const CONTROLS_HEIGHT = 68;

function getTargetWebContents() {
  if (mainView && !mainView.webContents.isDestroyed()) {
    return mainView.webContents;
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
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const [width, height] = mainWindow.getContentSize();
  if (mainView && !mainView.webContents.isDestroyed()) {
    mainView.setBounds({ x: 0, y: 0, width, height });
  }
  if (controlsView && !controlsView.webContents.isDestroyed()) {
    controlsView.setBounds({
      x: Math.max(0, width - CONTROLS_WIDTH),
      y: 0,
      width: CONTROLS_WIDTH,
      height: CONTROLS_HEIGHT,
    });
  }
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

  mainView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  controlsView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  mainWindow.addBrowserView(mainView);
  mainWindow.addBrowserView(controlsView);
  mainWindow.setTopBrowserView(controlsView);

  controlsView.setBackgroundColor('#00000000');

  mainView.setAutoResize({ width: true, height: true });
  controlsView.setAutoResize({ left: true, top: false, width: false, height: false });
  updateViewBounds();

  mainWindow.on('resize', updateViewBounds);

  mainView.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainView.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  createMenu();

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainView.webContents.loadURL(devUrl);
  } else {
    mainView.webContents.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  controlsView.webContents.loadFile(path.join(__dirname, 'controls.html'));

  const notifyMaximize = (isMax) => {
    if (mainView && !mainView.webContents.isDestroyed()) {
      mainView.webContents.send('window-maximized-changed', isMax);
    }
    if (controlsView && !controlsView.webContents.isDestroyed()) {
      controlsView.webContents.send('window-maximized-changed', isMax);
    }
  };

  mainWindow.on('maximize', () => {
    notifyMaximize(true);
  });

  mainWindow.on('unmaximize', () => {
    notifyMaximize(false);
  });

  mainWindow.on('closed', () => {
    mainView = null;
    controlsView = null;
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

ipcMain.handle('minimize-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    } else {
      mainWindow.maximize();
      return true;
    }
  }
  return false;
});

ipcMain.handle('close-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

ipcMain.handle('is-window-maximized', () => {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false;
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
