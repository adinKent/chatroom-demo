import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from '@emotion/styled';
import {
  Virtuoso,
  type IndexLocationWithAlign,
  type ListRange,
  type VirtuosoHandle,
} from 'react-virtuoso';
import { JumpToast } from './components/JumpToast';
import { MessageItem } from './components/MessageItem';
import { SettingsDialog } from './components/SettingsDialog';
import { useScrollAnchor } from './hooks/useScrollAnchor';
import { prefetchImageSizes } from './data/imageSize';
import {
  LAST_READ_ID,
  NEWEST_ID,
  PAGE_SIZE,
  TOTAL_MESSAGES,
  loadNewer,
  loadOlder,
  loadSurrounding,
} from './data/mockChat';
import type { ChatMessage, EntryMode } from './types';

const MODE_KEY = 'teams-chat-demo-entry-mode';

const Shell = styled.main`
  height: 100dvh;
  padding: 20px;
  background: #ececf3;
`;

const AppFrame = styled.section`
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(1180px, 100%);
  height: 100%;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid #d7d7e2;
  border-radius: 16px;
  background: #f5f5f8;
  box-shadow: 0 20px 60px rgb(31 41 55 / 12%);
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid #dedee8;
  background: #fff;
`;

const RoomMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  h1 {
    margin: 0;
    font-size: 18px;
  }

  p {
    margin: 2px 0 0;
    color: #77798b;
    font-size: 13px;
  }
`;

const RoomIcon = styled.div`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: #fff;
  background: #5b5fc7;
  font-weight: 800;
`;

const Toolbar = styled.div`
  display: flex;
  gap: 8px;
`;

const ToolButton = styled.button`
  padding: 8px 11px;
  border: 1px solid #d7d8e3;
  border-radius: 9px;
  background: #fff;
  color: #34354b;
  cursor: pointer;

  &:hover {
    background: #f4f3ff;
  }
`;

const Feed = styled.div`
  position: relative;
  min-height: 0;
`;

const Loading = styled.div`
  display: grid;
  height: 100%;
  place-items: center;
  color: #66687b;
`;

const LoadMarker = styled.div`
  padding: 8px;
  color: #77798b;
  text-align: center;
  font-size: 12px;
`;

const Composer = styled.footer`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid #dedee8;
  background: #fff;
`;

const FakeInput = styled.div`
  padding: 11px 12px;
  border: 1px solid #d7d8e3;
  border-radius: 10px;
  color: #8a8b99;
  background: #fafafd;
`;

const Send = styled.button`
  padding: 0 18px;
  border: 0;
  border-radius: 10px;
  color: #fff;
  background: #5b5fc7;
  font-weight: 700;
`;

function getStoredMode(): EntryMode | null {
  const value = localStorage.getItem(MODE_KEY);
  return value === 'last-read' || value === 'newest' ? value : null;
}

export default function App() {
  const storedMode = useMemo(getStoredMode, []);
  const [showSettings, setShowSettings] = useState(storedMode === null);
  const [draftMode, setDraftMode] = useState<EntryMode>(storedMode ?? 'last-read');
  const [entryMode, setEntryMode] = useState<EntryMode | null>(storedMode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [firstItemIndex, setFirstItemIndex] = useState(TOTAL_MESSAGES);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);
  const [visibleRange, setVisibleRange] = useState<ListRange>({ startIndex: 0, endIndex: 0 });
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  /**
   * 定位一律交給 initialTopMostItemIndex，不要 mount 後才 scrollToIndex：
   * 那時 Virtuoso 還沒量到真實的 item 高度，會用預估值算偏。
   * Virtuoso 只在掛載時讀這個值，而每次重新載入視窗都會經過 loading 把它卸載重掛。
   */
  const [initialLocation, setInitialLocation] = useState<IndexLocationWithAlign>({
    index: 0,
    align: 'center',
  });
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const initializedModeRef = useRef<EntryMode | null>(null);
  const windowAtBottomRef = useRef(false);
  const stickToBottomRef = useRef(false);
  const { setScroller, suspend } = useScrollAnchor({ atBottom: stickToBottomRef });

  /**
   * Virtuoso 的 atBottom 指的是「已載入視窗的底部」，不是「對話的最新一則」。
   * 上次閱讀模式的視窗底部離 NEWEST_ID 還很遠，在那裡黏底只會不斷觸發載入更新訊息。
   */
  const syncStickToBottom = useCallback(() => {
    stickToBottomRef.current =
      windowAtBottomRef.current && messagesRef.current.at(-1)?.id === NEWEST_ID;
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    syncStickToBottom();
  }, [messages, syncStickToBottom]);

  const focusMessage = useCallback((messageId: number) => {
    const localIndex = messagesRef.current.findIndex((message) => message.id === messageId);
    if (localIndex < 0) return false;

    suspend();
    virtuosoRef.current?.scrollToIndex({
      // scrollToIndex 使用目前 data 的區域索引；firstItemIndex 只用來維持 prepend 的
      // 全域編號。兩者相加會超出 data 範圍，讓 Virtuoso 誤捲到 window 尾端。
      index: localIndex,
      align: 'center',
      behavior: 'smooth',
    });
    setHighlightedId(messageId);
    window.setTimeout(() => setHighlightedId(null), 1_800);
    return true;
  }, [suspend]);

  const initialize = useCallback(async (mode: EntryMode) => {
    setLoading(true);
    initializedModeRef.current = mode;

    const targetId = mode === 'last-read' ? LAST_READ_ID : NEWEST_ID;
    const before = mode === 'newest' ? PAGE_SIZE * 2 : PAGE_SIZE;
    const after = mode === 'newest' ? 0 : PAGE_SIZE;
    const windowData = await loadSurrounding(targetId, before, after);

    prefetchImageSizes(windowData.messages);
    // Virtuoso 重新掛載後的首次量測會大幅搬動內容，錨點補償要整段避開。
    suspend(1_200);
    setInitialLocation({
      index: Math.max(windowData.messages.findIndex((message) => message.id === targetId), 0),
      align: mode === 'newest' ? 'end' : 'center',
    });
    setMessages(windowData.messages);
    setFirstItemIndex(windowData.firstId - 1);
    setLoading(false);
    setHighlightedId(targetId);
    window.setTimeout(() => setHighlightedId(null), 1_800);
  }, [suspend]);

  useEffect(() => {
    if (entryMode && initializedModeRef.current !== entryMode) {
      void initialize(entryMode);
    }
  }, [entryMode, initialize]);

  const confirmSettings = () => {
    localStorage.setItem(MODE_KEY, draftMode);
    setEntryMode(draftMode);
    setShowSettings(false);
  };

  const loadOlderMessages = useCallback(async () => {
    const first = messagesRef.current[0];
    if (!first || first.id <= 1 || loadingOlder) return;

    setLoadingOlder(true);
    const older = await loadOlder(first.id);
    if (older.length > 0) {
      prefetchImageSizes(older);
      setMessages((current) => [...older, ...current]);
      setFirstItemIndex((current) => current - older.length);
    }
    setLoadingOlder(false);
  }, [loadingOlder]);

  const loadNewerMessages = useCallback(async () => {
    const last = messagesRef.current.at(-1);
    if (!last || last.id >= NEWEST_ID || loadingNewer) return;

    setLoadingNewer(true);
    const newer = await loadNewer(last.id);
    if (newer.length > 0) {
      prefetchImageSizes(newer);
      setMessages((current) => [...current, ...newer]);
    }
    setLoadingNewer(false);
  }, [loadingNewer]);

  const jumpToMessage = useCallback(
    async (targetId: number, align: 'center' | 'end') => {
      if (focusMessage(targetId)) return;

      setLoading(true);
      const windowData = await loadSurrounding(
        targetId,
        align === 'end' ? PAGE_SIZE * 2 : PAGE_SIZE,
        align === 'end' ? 0 : PAGE_SIZE,
      );
      prefetchImageSizes(windowData.messages);
      suspend(1_200);
      setInitialLocation({
        index: Math.max(windowData.messages.findIndex((message) => message.id === targetId), 0),
        align,
      });
      setMessages(windowData.messages);
      setFirstItemIndex(windowData.firstId - 1);
      setLoading(false);
      setHighlightedId(targetId);
      window.setTimeout(() => setHighlightedId(null), 1_800);
    },
    [focusMessage, suspend],
  );

  const visibleStart = Math.max(0, visibleRange.startIndex - firstItemIndex);
  const visibleEnd = Math.max(visibleStart, visibleRange.endIndex - firstItemIndex);
  const visibleMessages = messages.slice(visibleStart, visibleEnd + 1);
  const firstVisibleId = visibleMessages[0]?.id;
  const lastVisibleId = visibleMessages.at(-1)?.id;

  const newestBelow =
    entryMode === 'last-read' &&
    lastVisibleId !== undefined &&
    NEWEST_ID > lastVisibleId;

  const lastReadAbove =
    entryMode === 'newest' &&
    firstVisibleId !== undefined &&
    LAST_READ_ID < firstVisibleId;

  return (
    <Shell>
      <AppFrame>
        <Header>
          <RoomMeta>
            <RoomIcon>TD</RoomIcon>
            <div>
              <h1>Teams Demo · 專案討論</h1>
              <p>{TOTAL_MESSAGES.toLocaleString('zh-TW')} 則模擬訊息 · 單一聊天室</p>
            </div>
          </RoomMeta>
          <Toolbar>
            <ToolButton onClick={() => setShowSettings(true)}>進入位置設定</ToolButton>
            <ToolButton
              onClick={() => {
                localStorage.removeItem(MODE_KEY);
                setShowSettings(true);
              }}
            >
              重設首次進入
            </ToolButton>
          </Toolbar>
        </Header>

        <Feed>
          {loading ? (
            <Loading>載入訊息中…</Loading>
          ) : (
            <Virtuoso
              ref={virtuosoRef}
              scrollerRef={setScroller}
              data={messages}
              firstItemIndex={firstItemIndex}
              initialTopMostItemIndex={initialLocation}
              rangeChanged={setVisibleRange}
              startReached={() => void loadOlderMessages()}
              endReached={() => void loadNewerMessages()}
              atBottomThreshold={80}
              atBottomStateChange={(bottom) => {
                windowAtBottomRef.current = bottom;
                syncStickToBottom();
              }}
              increaseViewportBy={{ top: 800, bottom: 900 }}
              computeItemKey={(_, message) => message.id}
              itemContent={(_, message) => (
                <MessageItem
                  message={message}
                  highlighted={message.id === highlightedId}
                  firstUnread={message.id === LAST_READ_ID + 1}
                />
              )}
              components={{
                Header: () => <LoadMarker>{loadingOlder ? '載入較舊訊息…' : '向上捲動載入較舊訊息'}</LoadMarker>,
                Footer: () => <LoadMarker>{loadingNewer ? '載入較新訊息…' : '向下捲動載入較新訊息'}</LoadMarker>,
              }}
            />
          )}

          {newestBelow && (
            <JumpToast
              edge="bottom"
              label="有更新訊息，前往最新訊息"
              onClick={() => void jumpToMessage(NEWEST_ID, 'end')}
            />
          )}

          {lastReadAbove && (
            <JumpToast
              edge="top"
              label="上次閱讀位置在上方"
              onClick={() => void jumpToMessage(LAST_READ_ID, 'center')}
            />
          )}
        </Feed>

        <Composer>
          <FakeInput>輸入新訊息（demo 不送出）</FakeInput>
          <Send type="button">傳送</Send>
        </Composer>
      </AppFrame>

      {showSettings && (
        <SettingsDialog value={draftMode} onChange={setDraftMode} onConfirm={confirmSettings} />
      )}
    </Shell>
  );
}
