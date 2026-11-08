import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR, { preload, useSWRConfig } from 'swr';
import type { IndexLocationWithAlign } from 'react-virtuoso';
import { prefetchImageSizes } from '../data/imageSize';
import {
  LAST_READ_ID,
  NEWEST_ID,
  PAGE_SIZE,
   TOTAL_MESSAGES,
  loadNewer,
  loadOlder,
  loadSurrounding,
} from '../data/mockChat';
import type { ChatMessage, EntryMode, LoadedWindow } from '../types';

export type WindowAlign = 'center' | 'end';

export const windowKey = (channelId: string, targetId: number, align: WindowAlign) =>
  ['chat-window', channelId, targetId, align] as const;

export const olderPageKey = (channelId: string, beforeId: number) =>
  ['chat-older', channelId, beforeId] as const;

export const newerPageKey = (channelId: string, afterId: number) =>
  ['chat-newer', channelId, afterId] as const;

type WindowKey = ReturnType<typeof windowKey>;
type OlderPageKey = ReturnType<typeof olderPageKey>;
type NewerPageKey = ReturnType<typeof newerPageKey>;

async function fetchWindow([, , targetId, align]: WindowKey): Promise<LoadedWindow> {
  const before = align === 'end' ? PAGE_SIZE * 2 : PAGE_SIZE;
  const after = align === 'end' ? 0 : PAGE_SIZE;
  return loadSurrounding(targetId, before, after);
}

async function fetchOlder([, , beforeId]: OlderPageKey): Promise<ChatMessage[]> {
  return loadOlder(beforeId, PAGE_SIZE);
}

async function fetchNewer([, , afterId]: NewerPageKey): Promise<ChatMessage[]> {
  return loadNewer(afterId, PAGE_SIZE);
}

interface AnchorTarget {
  targetId: number;
  align: WindowAlign;
  seq: number;
}

interface UseChatMessagesOptions {
  channelId: string;
  entryMode: EntryMode | null;
  onWindowMount?: (targetId: number) => void;
}

export function useChatMessages({
  channelId,
  entryMode,
  onWindowMount,
}: UseChatMessagesOptions) {
  const { mutate } = useSWRConfig();

  const [anchor, setAnchor] = useState<AnchorTarget | null>(() => {
    if (!entryMode) return null;
    return {
      targetId: entryMode === 'newest' ? NEWEST_ID : LAST_READ_ID,
      align: entryMode === 'newest' ? 'end' : 'center',
      seq: 0,
    };
  });

  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);

  const currentKey = useMemo(
    () => (entryMode && anchor ? windowKey(channelId, anchor.targetId, anchor.align) : null),
    [channelId, entryMode, anchor],
  );

  const { data, isLoading, mutate: mutateWindow } = useSWR(currentKey, fetchWindow, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60_000,
  });

  const messages = data?.messages ?? [];
  const firstItemIndex = data ? data.firstId - 1 : TOTAL_MESSAGES;
  const loading = Boolean(currentKey && isLoading && !data);

  // 每次切換錨點或頻道且視窗資料到位時，預取該視窗內的圖片尺寸並通知外部暫停錨點補償
  const mountedSignatureRef = useRef<string | null>(null);
  const windowSignature =
    data && anchor ? `${channelId}:${anchor.targetId}:${anchor.align}:${anchor.seq}` : null;

  useEffect(() => {
    if (!data || !anchor || !windowSignature) return;
    if (mountedSignatureRef.current === windowSignature) return;

    mountedSignatureRef.current = windowSignature;
    prefetchImageSizes(data.messages);
    onWindowMount?.(anchor.targetId);
  }, [data, anchor, windowSignature, onWindowMount]);

  const initialLocation = useMemo<IndexLocationWithAlign>(() => {
    if (!data || !anchor) {
      return { index: 0, align: 'center' };
    }
    const index = Math.max(
      data.messages.findIndex((message) => message.id === anchor.targetId),
      0,
    );
    return { index, align: anchor.align };
  }, [data, anchor]);

  const selectAnchor = useCallback((targetId: number, align: WindowAlign) => {
    setAnchor((prev) => ({
      targetId,
      align,
      seq: (prev?.seq ?? 0) + 1,
    }));
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!data || loadingOlder) return;
    const first = data.messages[0];
    if (!first || first.id <= 1) return;

    setLoadingOlder(true);
    try {
      const pageKey = olderPageKey(channelId, first.id);
      const older = await mutate<ChatMessage[]>(
        pageKey,
        (cached) => cached ?? (preload(pageKey, fetchOlder) ?? fetchOlder(pageKey)),
        { revalidate: false },
      );

      if (older && older.length > 0) {
        prefetchImageSizes(older);
        await mutateWindow(
          (current) => {
            if (!current || current.messages[0]?.id !== first.id) return current;
            const newFirstId = older[0].id;
            return {
              ...current,
              messages: [...older, ...current.messages],
              firstId: newFirstId,
              hasOlder: newFirstId > 1,
            };
          },
          { revalidate: false },
        );
      }
    } finally {
      setLoadingOlder(false);
    }
  }, [channelId, data, loadingOlder, mutate, mutateWindow]);

  const loadNewerMessages = useCallback(async () => {
    if (!data || loadingNewer) return;
    const last = data.messages.at(-1);
    if (!last || last.id >= NEWEST_ID) return;

    setLoadingNewer(true);
    try {
      const pageKey = newerPageKey(channelId, last.id);
      const newer = await mutate<ChatMessage[]>(
        pageKey,
        (cached) => cached ?? (preload(pageKey, fetchNewer) ?? fetchNewer(pageKey)),
        { revalidate: false },
      );

      if (newer && newer.length > 0) {
        prefetchImageSizes(newer);
        await mutateWindow(
          (current) => {
            if (!current || current.messages.at(-1)?.id !== last.id) return current;
            const newLastId = newer.at(-1)!.id;
            return {
              ...current,
              messages: [...current.messages, ...newer],
              lastId: newLastId,
              hasNewer: newLastId < NEWEST_ID,
            };
          },
          { revalidate: false },
        );
      }
    } finally {
      setLoadingNewer(false);
    }
  }, [channelId, data, loadingNewer, mutate, mutateWindow]);

  // 當捲動接近已載入視窗的頂部或底部時，利用 SWR preload 背景預取相鄰分頁
  const prefetchAdjacentPages = useCallback(
    (visibleStartLocal: number, visibleEndLocal: number) => {
      if (!data) return;
      const totalLoaded = data.messages.length;
      const firstId = data.messages[0]?.id;
      const lastId = data.messages.at(-1)?.id;

      if (visibleStartLocal < 15 && firstId && firstId > 1) {
        void preload(olderPageKey(channelId, firstId), fetchOlder);
      }
      if (totalLoaded - visibleEndLocal < 15 && lastId && lastId < NEWEST_ID) {
        void preload(newerPageKey(channelId, lastId), fetchNewer);
      }
    },
    [channelId, data],
  );

  // 預取指定錨點視窗（供 JumpToast 出現或 Hover 時呼叫）
  const prefetchAnchor = useCallback(
    (targetId: number, align: WindowAlign) => {
      void preload(windowKey(channelId, targetId, align), fetchWindow);
    },
    [channelId],
  );

  return {
    messages,
    firstItemIndex,
    loading,
    loadingOlder,
    loadingNewer,
    initialLocation,
    virtuosoKey: windowSignature ?? 'uninitialized',
    selectAnchor,
    loadOlderMessages,
    loadNewerMessages,
    prefetchAdjacentPages,
    prefetchAnchor,
  };
}

