# Teams Chat Demo

React + TypeScript 單一聊天室 demo，模擬 Microsoft Teams 的大量訊息閱讀體驗。

## 功能

- 第一次進入聊天室時，可選擇：
  - 前往上次閱讀訊息
  - 前往最新訊息
- 使用 `localStorage` 保存進入位置偏好。
- 第一則未讀訊息上方顯示 Teams 風格的「上次閱讀」分隔線。
- 前往上次閱讀時，如果最新訊息在可視區域下方，顯示底部 toast。
- 前往最新訊息時，如果上次閱讀訊息在可視區域上方，顯示頂部 toast。
- `loadSurrounding(targetId)` 模擬以指定訊息為中心做 lazy load。
- 支援向上與向下追加訊息。
- 使用 `react-virtuoso` 虛擬化 50,000 則模擬訊息，DOM 只保留可視範圍附近內容。
- 圖片訊息只有連結、沒有尺寸，由前端量測後保持 scroll position 不跳動。
- 使用 Emotion 製作 UI。

## 執行

```bash
npm install
npm run dev
```

正式 build：

```bash
npm run build
npm run preview
```

Smoke test（會自己開 dev server 和 headless Chrome）：

```bash
npm run smoke
```

## 主要設計

### loadSurrounding

`src/data/mockChat.ts` 中的 `loadSurrounding` 接受 target message id，回傳前後一小段訊息。真實後端可替換成 cursor API：

```ts
loadSurrounding(targetId, beforeCount, afterCount)
```

### 大量訊息效能

- 不一次建立 50,000 個訊息物件，只建立目前 window。
- `react-virtuoso` 只 render viewport 周圍的訊息。
- `MessageItem` 使用 `React.memo`。
- 載入舊訊息時使用 `firstItemIndex` 保持 scroll anchor，不讓畫面跳動。
- 跳到很遠的訊息時，直接丟棄目前 window 並重新載入 surrounding window，避免記憶體無限成長。

### 圖片載入不影響 scroll position

後端只給圖片連結，沒有尺寸，所以分三層處理：

1. `src/data/imageSize.ts` 用離屏 `Image` 量測原始尺寸，記憶體加 `sessionStorage` 快取。訊息一載入就先量（`prefetchImageSizes`），讓量測發生在使用者捲到那則訊息之前。
2. `MessageImage` 依量到的比例算出固定像素框，尺寸已知時完全不會有版面變動。
3. `src/hooks/useScrollAnchor.ts` 兜底：量測沒趕上時，用 ResizeObserver 把錨點訊息的位移補回 `scrollTop`。只有錨點以上的變化才會產生位移量，所以往下捲不受影響；使用者自己捲離底部超過 80px 就交還控制權。

定位一律透過 `initialTopMostItemIndex`，不在 mount 後才 `scrollToIndex`——那時 Virtuoso 還沒量到真實 item 高度，會用預估值算偏。

### Smoke test

`scripts/smoke.mjs` 用 CDP 驅動 headless Chrome，對兩種進入模式各檢查：定位是否落在目標訊息、圖片載入期間畫面是否自己捲動、滾輪捲動是否被補償邏輯擋掉。限速網路確保圖片是進到畫面之後才撐開，補償路徑才真的會被執行到。

## Demo 常數

- 總訊息：50,000
- Last read message：12,430
- Newest message：50,000
