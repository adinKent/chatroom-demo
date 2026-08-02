import type { ChatMessage, LoadedWindow } from '../types';

export const TOTAL_MESSAGES = 50_000;
export const LAST_READ_ID = 12_430;
export const NEWEST_ID = TOTAL_MESSAGES;
export const PAGE_SIZE = 60;

const authors = [
  { name: 'Alex Chen', avatar: 'AC' },
  { name: 'Jamie Lin', avatar: 'JL' },
  { name: 'Morgan Wu', avatar: 'MW' },
  { name: 'Taylor Kao', avatar: 'TK' },
  { name: '你', avatar: 'KC' },
];

const samples = [
  '我把最新的設計稿放到 shared folder，請大家有空看一下。',
  '這個行為應該要保留使用者目前的閱讀位置。',
  'API response 已經加上 cursor，前端可以開始串接。',
  '我剛測過大量訊息，scroll position 看起來穩定。',
  '明天 stand-up 再一起確認 edge cases。',
  '收到，我會補上測試案例。',
  '這一段先用 feature flag 控制，避免影響現有使用者。',
  '效能數據更新：初次載入只 render 可視範圍附近的訊息。',
  '有人可以 review 這個 PR 嗎？',
  '看起來沒問題，我留了一個 naming 建議。',
];

const startTime = new Date('2025-01-01T00:00:00Z').getTime();

const IMAGE_EVERY = 7;

// 刻意用差異很大的比例，才看得出尺寸未知時的位移問題。
const imageShapes = [
  [800, 600],
  [640, 960],
  [1200, 675],
  [500, 500],
  [900, 400],
  [720, 1280],
];

function imageUrlFor(id: number): string | undefined {
  if (id % IMAGE_EVERY !== 0) return undefined;
  const [width, height] = imageShapes[(id / IMAGE_EVERY) % imageShapes.length];
  return `https://picsum.photos/seed/teams-${id}/${width}/${height}`;
}

function createMessage(id: number): ChatMessage {
  const author = authors[id % authors.length];
  const sentAt = new Date(startTime + id * 90_000).toISOString();

  return {
    id,
    author: author.name,
    avatar: author.avatar,
    sentAt,
    text: `${samples[id % samples.length]}（訊息 #${id.toLocaleString('zh-TW')}）`,
    isMine: author.name === '你',
    imageUrl: imageUrlFor(id),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createRange(firstId: number, lastId: number): ChatMessage[] {
  const result: ChatMessage[] = [];
  for (let id = firstId; id <= lastId; id += 1) {
    result.push(createMessage(id));
  }
  return result;
}

function delay(ms = 220): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * 模擬後端的「以目標訊息為中心」載入。
 * 真實系統通常會以 message id / timestamp / cursor 查詢前後訊息。
 */
export async function loadSurrounding(
  targetId: number,
  before = PAGE_SIZE,
  after = PAGE_SIZE,
): Promise<LoadedWindow> {
  await delay();

  const safeTarget = clamp(targetId, 1, TOTAL_MESSAGES);
  const firstId = clamp(safeTarget - before, 1, TOTAL_MESSAGES);
  const lastId = clamp(safeTarget + after, 1, TOTAL_MESSAGES);

  return {
    messages: createRange(firstId, lastId),
    firstId,
    lastId,
    hasOlder: firstId > 1,
    hasNewer: lastId < TOTAL_MESSAGES,
  };
}

export async function loadOlder(beforeId: number, count = PAGE_SIZE): Promise<ChatMessage[]> {
  await delay(150);
  const lastId = clamp(beforeId - 1, 0, TOTAL_MESSAGES);
  if (lastId < 1) return [];
  const firstId = clamp(lastId - count + 1, 1, TOTAL_MESSAGES);
  return createRange(firstId, lastId);
}

export async function loadNewer(afterId: number, count = PAGE_SIZE): Promise<ChatMessage[]> {
  await delay(150);
  const firstId = clamp(afterId + 1, 1, TOTAL_MESSAGES + 1);
  if (firstId > TOTAL_MESSAGES) return [];
  const lastId = clamp(firstId + count - 1, 1, TOTAL_MESSAGES);
  return createRange(firstId, lastId);
}
