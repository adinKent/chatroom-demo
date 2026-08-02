export interface ImageSize {
  width: number;
  height: number;
}

const STORAGE_KEY = 'teams-chat-demo-image-sizes';
const MAX_PERSISTED = 1_000;
const PERSIST_DELAY = 500;

const cache = new Map<string, ImageSize>();
const pending = new Map<string, Promise<ImageSize | null>>();
let persistTimer: number | null = null;

function restore() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, ImageSize>;
    for (const [url, size] of Object.entries(parsed)) {
      if (size && size.width > 0 && size.height > 0) cache.set(url, size);
    }
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

restore();

function persist() {
  if (persistTimer !== null) return;

  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    // Map 保留插入順序，超量時丟掉最舊的紀錄。
    const entries = [...cache.entries()].slice(-MAX_PERSISTED);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {
      // 配額不足就放棄持久化，記憶體快取仍然有效。
    }
  }, PERSIST_DELAY);
}

export function getCachedSize(url: string): ImageSize | null {
  return cache.get(url) ?? null;
}

/**
 * 用離屏 Image 取得圖片原始尺寸。同一個 URL 之後掛到真正的 <img> 時會直接命中
 * 瀏覽器快取，所以這裡的下載不是額外成本，而是預熱。
 */
export function measureImage(url: string): Promise<ImageSize | null> {
  const cached = cache.get(url);
  if (cached) return Promise.resolve(cached);

  const inflight = pending.get(url);
  if (inflight) return inflight;

  const task = new Promise<ImageSize | null>((resolve) => {
    const probe = new Image();
    probe.decoding = 'async';
    probe.onload = () => {
      const size = { width: probe.naturalWidth, height: probe.naturalHeight };
      if (size.width > 0 && size.height > 0) {
        cache.set(url, size);
        persist();
        resolve(size);
        return;
      }
      resolve(null);
    };
    probe.onerror = () => resolve(null);
    probe.src = url;
  }).finally(() => pending.delete(url));

  pending.set(url, task);
  return task;
}

/** 訊息一進來就先量，讓量測發生在使用者捲到之前。 */
export function prefetchImageSizes(messages: { imageUrl?: string }[]) {
  for (const message of messages) {
    if (message.imageUrl) void measureImage(message.imageUrl);
  }
}
