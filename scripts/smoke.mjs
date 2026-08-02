/**
 * 進入位置 + 捲動位置的 smoke test。
 *
 * 用 CDP 驅動 headless Chrome 跑完整流程，檢查三件事：
 *   1. 兩種進入模式都定位到正確的訊息，不會偏掉。
 *   2. 停下來之後畫面不會自己往下捲（圖片撐開不該觸發連鎖載入）。
 *   3. 滾輪捲動不會被補償邏輯拉回去。
 *
 * 執行：npm run smoke
 * 環境變數：PORT（預設 5190）、CHROME_PATH、HEADFUL=1（開視窗看過程）。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT ?? 5190);
const CDP_PORT = PORT + 100;
const APP_URL = `http://localhost:${PORT}/`;
const MODE_KEY = 'teams-chat-demo-entry-mode';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 直接從 mockChat.ts 讀常數，避免測試裡的期望值跟資料來源各走各的。
function readConstants() {
  const source = readFileSync(join(ROOT, 'src/data/mockChat.ts'), 'utf8');
  const read = (name) => {
    const match = source.match(new RegExp(`export const ${name} = ([0-9_]+)`));
    if (!match) throw new Error(`無法從 mockChat.ts 讀出 ${name}`);
    return Number(match[1].replaceAll('_', ''));
  };
  const total = read('TOTAL_MESSAGES');
  return { lastReadId: read('LAST_READ_ID'), newestId: total };
}

async function waitForServer(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      /* 還沒起來 */
    }
    await sleep(250);
  }
  throw new Error(`dev server 沒有在 ${url} 起來`);
}

function startDevServer() {
  const bin = join(ROOT, 'node_modules/.bin/vite');
  if (!existsSync(bin)) throw new Error('找不到 node_modules/.bin/vite，請先 npm install');
  return spawn(bin, ['--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
}

function startChrome(profile) {
  const binary = CHROME_CANDIDATES.find((path) => existsSync(path));
  if (!binary) throw new Error('找不到 Chrome，請用 CHROME_PATH 指定路徑');
  const args = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=900,800',
    'about:blank',
  ];
  if (!process.env.HEADFUL) args.unshift('--headless=new');
  return spawn(binary, args, { stdio: 'ignore' });
}

async function connect() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const targets = await (await fetch(`http://localhost:${CDP_PORT}/json/list`)).json();
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) {
        const socket = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
        return socket;
      }
    } catch {
      /* chrome 還沒開好 debug port */
    }
    await sleep(250);
  }
  throw new Error('連不上 CDP');
}

function createSession(socket) {
  let nextId = 1;
  const waiters = new Map();
  const pageErrors = [];

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && waiters.has(message.id)) {
      waiters.get(message.id)(message);
      waiters.delete(message.id);
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') {
      pageErrors.push(message.params.exceptionDetails.exception?.description ?? 'exception');
    }
  });

  const send = (method, params = {}) => {
    const id = nextId++;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve) => waiters.set(id, resolve));
  };

  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    const details = response.result?.exceptionDetails;
    if (details) throw new Error(details.exception?.description ?? '頁面內執行失敗');
    return response.result.result.value;
  };

  return { send, evaluate, pageErrors };
}

const PROBE = `(() => {
  const scroller = document.querySelector('[data-virtuoso-scroller]');
  if (!scroller) return { ready: false };
  const base = scroller.getBoundingClientRect();
  const visible = [...scroller.querySelectorAll('[data-message-id]')]
    .filter((row) => {
      const box = row.getBoundingClientRect();
      return box.bottom > base.top && box.top < base.bottom;
    })
    .map((row) => Number(row.dataset.messageId));
  return {
    ready: true,
    scrollTop: Math.round(scroller.scrollTop),
    scrollHeight: Math.round(scroller.scrollHeight),
    first: visible[0],
    last: visible[visible.length - 1],
  };
})()`;

function throttle(session, slow) {
  return session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: slow ? 300 : 0,
    downloadThroughput: slow ? 300_000 : -1,
    uploadThroughput: slow ? 300_000 : -1,
  });
}

async function wheel(session, deltaY, times) {
  for (let i = 0; i < times; i += 1) {
    await session.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: 450,
      y: 400,
      deltaX: 0,
      deltaY,
      pointerType: 'mouse',
    });
    await sleep(120);
  }
  await sleep(1_500);
}

async function runMode(session, { label, optionText, targetId }) {
  const failures = [];
  const note = (text) => console.log(`    ${text}`);

  await throttle(session, false);
  await session.send('Page.navigate', { url: APP_URL });
  await sleep(1_200);
  await session.evaluate(`localStorage.removeItem(${JSON.stringify(MODE_KEY)}); sessionStorage.clear()`);
  await session.send('Page.reload');
  await sleep(1_500);
  // 頁面載完才開始限速，只拖慢圖片，讓它們確定是進到畫面之後才撐開。
  await throttle(session, true);

  const clickByText = (text) => `(() => {
    const button = [...document.querySelectorAll('button')]
      .find((b) => b.textContent.includes(${JSON.stringify(text)}));
    if (!button) return 'missing';
    button.click();
    return 'ok';
  })()`;

  // 兩次點擊要分開；同一個 task 內 confirm 讀到的還是上一個 render 的 draftMode。
  if ((await session.evaluate(clickByText(optionText))) === 'missing') {
    throw new Error(`對話框找不到「${optionText}」`);
  }
  await sleep(400);
  if ((await session.evaluate(clickByText('進入聊天室'))) === 'missing') {
    throw new Error('對話框找不到「進入聊天室」');
  }
  await sleep(1_200);

  const landed = await session.evaluate(PROBE);
  if (!landed.ready) throw new Error('清單沒有掛載');
  note(`landed     top=${landed.scrollTop} h=${landed.scrollHeight} vis=${landed.first}..${landed.last}`);
  if (!(targetId >= landed.first && targetId <= landed.last)) {
    failures.push(`定位偏掉：期望看到 ${targetId}，實際可視範圍是 ${landed.first}..${landed.last}`);
  }

  // 觀察期：圖片陸續載入撐開高度。可視範圍不該因此改變，也不該連鎖載入更新訊息。
  let idle = landed;
  let drift = 0;
  // 佔位框是 320x240，實際圖片可能更矮，所以高度變化有正有負，取絕對值。
  let resize = 0;
  for (let i = 0; i < 18; i += 1) {
    await sleep(300);
    const sample = await session.evaluate(PROBE);
    if (!sample.ready || sample.first === undefined) continue;
    idle = sample;
    drift = Math.max(drift, Math.abs(sample.first - landed.first));
    resize = Math.max(resize, Math.abs(sample.scrollHeight - landed.scrollHeight));
  }
  note(`idle       top=${idle.scrollTop} h=${idle.scrollHeight} vis=${idle.first}..${idle.last}`);
  if (drift > 2) {
    failures.push(`圖片載入期間畫面自己捲動了 ${drift} 則（從 ${landed.first} 起算）`);
  }
  note(
    resize > 0
      ? `（觀察期高度變動 ${resize}px，可視範圍位移 ${drift} 則，補償有被實際觸發）`
      : '（高度沒有變化，圖片可能沒載到，這輪沒測到補償）',
  );

  await wheel(session, -240, 12);
  const up = await session.evaluate(PROBE);
  note(`wheel-up   top=${up.scrollTop} h=${up.scrollHeight} vis=${up.first}..${up.last}`);
  if (up.first >= idle.first) {
    failures.push(`滾輪往上捲沒有生效：停在 ${up.first}，捲之前是 ${idle.first}`);
  }

  await wheel(session, 300, 20);
  const down = await session.evaluate(PROBE);
  note(`wheel-down top=${down.scrollTop} h=${down.scrollHeight} vis=${down.first}..${down.last}`);
  if (down.first <= up.first) {
    failures.push(`滾輪往下捲沒有生效：停在 ${down.first}，捲之前是 ${up.first}`);
  }

  await sleep(2_500);
  const settled = await session.evaluate(PROBE);
  note(`settled    top=${settled.scrollTop} h=${settled.scrollHeight} vis=${settled.first}..${settled.last}`);
  if (Math.abs(settled.first - down.first) > 2) {
    failures.push(`停止捲動後畫面繼續漂移：${down.first} 變成 ${settled.first}`);
  }

  console.log(`  ${failures.length === 0 ? 'PASS' : 'FAIL'}  ${label}`);
  for (const failure of failures) console.log(`        ${failure}`);
  return failures.length === 0;
}

const { lastReadId, newestId } = readConstants();
const profile = mkdtempSync(join(tmpdir(), 'teams-chat-smoke-'));
let devServer;
let chrome;
let socket;

try {
  devServer = startDevServer();
  await waitForServer(APP_URL);
  chrome = startChrome(profile);
  socket = await connect();

  const session = createSession(socket);
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  // 關掉快取，兩輪都走「第一次看到這些圖」的冷路徑，補償才有東西可以測。
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });

  const results = [];
  console.log('  上次閱讀位置');
  results.push(
    await runMode(session, { label: '上次閱讀位置', optionText: '前往上次閱讀', targetId: lastReadId }),
  );
  console.log('  最新訊息');
  results.push(
    await runMode(session, { label: '最新訊息', optionText: '前往最新訊息', targetId: newestId }),
  );

  if (session.pageErrors.length > 0) {
    console.log('\n  頁面拋出例外：');
    for (const error of session.pageErrors) console.log(`    ${error}`);
  }

  const ok = results.every(Boolean) && session.pageErrors.length === 0;
  console.log(ok ? '\nsmoke test 通過' : '\nsmoke test 失敗');
  process.exitCode = ok ? 0 : 1;
} catch (error) {
  console.error(`\nsmoke test 中斷：${error.message}`);
  process.exitCode = 1;
} finally {
  socket?.close();
  chrome?.kill();
  devServer?.kill();
  // Chrome 收到 kill 之後還會寫一下 profile，直接刪會撞到 ENOTEMPTY。
  await sleep(500);
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    console.log(`  （暫存 profile 沒刪乾淨，可自行移除：${profile}）`);
  }
}
