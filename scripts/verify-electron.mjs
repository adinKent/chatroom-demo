import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import electron from 'electron';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const tempScript = join(ROOT, 'electron/test-runner.cjs');

console.log('Testing Electron launch and zoom functionality...');

const testCode = `
const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const path = require('path');

ipcMain.handle('set-zoom-factor', (_event, factor) => factor);
ipcMain.handle('get-zoom-factor', () => 1.0);

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      show: false,
      width: 1200,
      height: 800,
    });

    const view = new BrowserView({
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    win.setBrowserView(view);
    view.setBounds({ x: 0, y: 0, width: 1200, height: 800 });

    await view.webContents.loadFile(path.join(__dirname, '../dist/index.html'));
    const title = await view.webContents.executeJavaScript('document.title');
    console.log('BrowserView Page Title:', title);

    const initialZoom = view.webContents.getZoomFactor();
    console.log('Initial Zoom Factor:', initialZoom);

    view.webContents.setZoomFactor(1.25);
    const zoomed = view.webContents.getZoomFactor();
    console.log('Zoomed Factor:', zoomed);

    view.webContents.setZoomFactor(1.0);
    const reset = view.webContents.getZoomFactor();
    console.log('Reset Zoom Factor:', reset);

    const devToolsPromise = new Promise((resolve) => {
      view.webContents.once('devtools-opened', () => resolve(true));
    });
    view.webContents.openDevTools({ mode: 'detach' });
    const devToolsOpened = await devToolsPromise;
    console.log('DevTools Opened:', devToolsOpened);
    view.webContents.closeDevTools();

    if (
      title !== 'Teams Chat Demo' ||
      Math.abs(zoomed - 1.25) > 0.01 ||
      Math.abs(reset - 1.0) > 0.01 ||
      !devToolsOpened
    ) {
      console.error('VERIFICATION FAILED');
      app.exit(1);
    } else {
      console.log('ELECTRON VERIFICATION PASSED');
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
