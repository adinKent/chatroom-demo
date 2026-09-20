import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import electron from 'electron';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const tempScript = join(ROOT, 'electron/test-runner.cjs');

console.log('Testing Electron multi-BrowserView architecture and controls...');

const testCode = `
const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const path = require('path');

ipcMain.handle('set-zoom-factor', (_event, factor) => factor);
ipcMain.handle('get-zoom-factor', () => 1.0);

let testWin = null;
let testMainView = null;
let testControlsView = null;

ipcMain.handle('minimize-window', () => {});
ipcMain.handle('maximize-window', () => {
  if (testWin.isMaximized()) {
    testWin.unmaximize();
    return false;
  } else {
    testWin.maximize();
    return true;
  }
});
ipcMain.handle('close-window', () => {});
ipcMain.handle('is-window-maximized', () => testWin.isMaximized());

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      show: false,
      width: 1200,
      height: 800,
      frame: false,
    });
    testWin = win;

    const mainView = new BrowserView({
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    testMainView = mainView;

    const controlsView = new BrowserView({
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    testControlsView = controlsView;

    win.addBrowserView(mainView);
    win.addBrowserView(controlsView);
    win.setTopBrowserView(controlsView);

    controlsView.setBackgroundColor('#00000000');
    mainView.setBounds({ x: 0, y: 0, width: 1200, height: 800 });
    controlsView.setBounds({ x: 1200 - 136, y: 0, width: 136, height: 68 });

    await mainView.webContents.loadFile(path.join(__dirname, '../dist/index.html'));
    await controlsView.webContents.loadFile(path.join(__dirname, 'controls.html'));

    const views = win.getBrowserViews();
    console.log('BrowserViews count:', views.length);

    const title = await mainView.webContents.executeJavaScript('document.title');
    console.log('MainView Page Title:', title);

    const controlsTitle = await controlsView.webContents.executeJavaScript('document.title');
    console.log('ControlsView Title:', controlsTitle);

    // Zoom mainView
    mainView.webContents.setZoomFactor(1.25);
    const mainZoomed = mainView.webContents.getZoomFactor();
    const controlsZoom = controlsView.webContents.getZoomFactor();
    console.log('MainView Zoomed:', mainZoomed, 'ControlsView Zoom (isolated):', controlsZoom);

    // DevTools check on mainView
    const devToolsPromise = new Promise((resolve) => {
      mainView.webContents.once('devtools-opened', () => resolve(true));
    });
    mainView.webContents.openDevTools({ mode: 'detach' });
    const devToolsOpened = await devToolsPromise;
    console.log('DevTools Opened on mainView:', devToolsOpened);
    mainView.webContents.closeDevTools();

    // Test maximize via controlsView's electronAPI
    await controlsView.webContents.executeJavaScript('window.electronAPI.maximize()');
    const isMax = await controlsView.webContents.executeJavaScript('window.electronAPI.isMaximized()');
    console.log('Window Maximized via ControlsView API:', isMax);

    await controlsView.webContents.executeJavaScript('window.electronAPI.maximize()');
    const isRestored = !(await controlsView.webContents.executeJavaScript('window.electronAPI.isMaximized()'));
    console.log('Window Restored via ControlsView API:', isRestored);

    if (
      views.length !== 2 ||
      title !== 'Teams Chat Demo' ||
      controlsTitle !== 'Window Controls' ||
      Math.abs(mainZoomed - 1.25) > 0.01 ||
      Math.abs(controlsZoom - 1.0) > 0.01 ||
      !devToolsOpened ||
      !isMax ||
      !isRestored
    ) {
      console.error('VERIFICATION FAILED');
      app.exit(1);
    } else {
      console.log('ELECTRON MULTI-BROWSERVIEW VERIFICATION PASSED');
      app.exit(0);
    }
  } catch (err) {
    console.error('Error during verification:', err);
    app.exit(1);
  }
});
`;

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

writeFileSync(tempScript, testCode);

const proc = spawn(electron, [tempScript], {
  cwd: ROOT,
  env,
  stdio: 'inherit',
});

proc.on('close', (code) => {
  try {
    unlinkSync(tempScript);
  } catch {}
  process.exit(code ?? 0);
});
