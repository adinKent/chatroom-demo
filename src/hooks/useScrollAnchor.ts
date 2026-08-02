import { useCallback, useEffect, useRef, useState } from 'react';

const ANCHOR_SELECTOR = '[data-message-id]';
/**
 * Virtuoso 的 scroller 第一層是固定 height:100% 的 viewport，高度永遠不變。
 * 真正會隨內容長高的是內層的 item list（上下用 filler row 撐出總高度）。
 */
const CONTENT_SELECTOR = '[data-testid="virtuoso-item-list"]';
const EPSILON = 0.5;
const ATTACH_RETRIES = 10;
/** 使用者自己捲到離底部多近，才算「還想黏在底部」。 */
const STICKY_THRESHOLD = 80;

interface Options {
  /** 使用者是否貼在底部；貼底時改成維持在底部，而不是維持錨點像素位置。 */
  atBottom: { current: boolean };
}

/**
 * 內容在 viewport 上方長高（例如圖片載入後撐開）時，把 scrollTop 補回去，
 * 讓使用者眼前的訊息維持在原本的位置。
 *
 * 只有錨點以上的高度變化才會產生位移量，往下捲看新內容不受影響。
 * 修正寫在 ResizeObserver callback 裡，跟 layout 同一幀落地，所以看不到閃跳。
 */
export function useScrollAnchor({ atBottom }: Options) {
  const [scroller, setScrollerElement] = useState<HTMLElement | null>(null);
  const suspendUntilRef = useRef(0);

  const setScroller = useCallback((element: HTMLElement | Window | null) => {
    setScrollerElement(element instanceof HTMLElement ? element : null);
  }, []);

  /** 程式化捲動（scrollToIndex、smooth 動畫）期間先停手，避免互相打架。 */
  const suspend = useCallback((ms = 700) => {
    suspendUntilRef.current = performance.now() + ms;
  }, []);

  useEffect(() => {
    if (!scroller) return;

    let anchorElement: Element | null = null;
    let anchorTop = 0;
    let selfScrollTop = -1;
    let pickScheduled = false;
    let attachFrame = 0;
    let userDistanceFromBottom = 0;

    const measureDistanceFromBottom = () =>
      scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;

    const pickAnchor = () => {
      const base = scroller.getBoundingClientRect().top;
      anchorElement = null;
      // 節點依 DOM 順序排列，第一個頂邊落在可視範圍內的就是錨點。
      for (const element of scroller.querySelectorAll(ANCHOR_SELECTOR)) {
        const top = element.getBoundingClientRect().top - base;
        if (top >= 0) {
          anchorElement = element;
          anchorTop = top;
          return;
        }
      }
    };

    const handleScroll = () => {
      // 忽略自己剛寫進去的 scrollTop，否則會把補償後的位置誤當成使用者的新意圖。
      if (selfScrollTop >= 0 && Math.abs(scroller.scrollTop - selfScrollTop) < 1) return;
      selfScrollTop = -1;
      // 同步記下來：黏底與否要看使用者「離開這一幀之前」在哪，
      // 不能等 resize 之後再量，那時候上方長高已經把距離推大了。
      userDistanceFromBottom = measureDistanceFromBottom();
      if (pickScheduled) return;
      pickScheduled = true;
      requestAnimationFrame(() => {
        pickScheduled = false;
        pickAnchor();
      });
    };

    const observer = new ResizeObserver(() => {
      if (performance.now() < suspendUntilRef.current) {
        pickAnchor();
        return;
      }

      // 使用者只要自己捲離底部就交還控制權，否則黏底會把滾輪捲動一直拉回去。
      if (atBottom.current && userDistanceFromBottom <= STICKY_THRESHOLD) {
        const bottom = scroller.scrollHeight - scroller.clientHeight;
        if (scroller.scrollTop < bottom - EPSILON) {
          selfScrollTop = bottom;
          scroller.scrollTop = bottom;
        }
        return;
      }

      if (!anchorElement?.isConnected) {
        pickAnchor();
        return;
      }

      const base = scroller.getBoundingClientRect().top;
      const delta = anchorElement.getBoundingClientRect().top - base - anchorTop;
      if (Math.abs(delta) < EPSILON) return;

      // 刻意不在這裡重選錨點：react-virtuoso 自己也會補償，
      // 兩邊瞄準同一個 anchorTop，多跑一幀就收斂。
      const next = scroller.scrollTop + delta;
      selfScrollTop = next;
      scroller.scrollTop = next;
    });

    const attach = (attempt = 0) => {
      const content = scroller.querySelector(CONTENT_SELECTOR);
      if (content) {
        observer.observe(content);
        userDistanceFromBottom = measureDistanceFromBottom();
        pickAnchor();
        return;
      }
      if (attempt < ATTACH_RETRIES) {
        attachFrame = requestAnimationFrame(() => attach(attempt + 1));
      }
    };

    attach();
    scroller.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(attachFrame);
      observer.disconnect();
      scroller.removeEventListener('scroll', handleScroll);
    };
  }, [scroller, atBottom]);

  return { setScroller, suspend };
}
