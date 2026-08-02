# Teams Chat Demo

React + TypeScript 單一聊天室 demo，模擬 Microsoft Teams 的大量訊息閱讀體驗。

## 功能

- 第一次進入聊天室時，可選擇：
  - 前往上次閱讀訊息
  - 前往最新訊息
- 使用 `localStorage` 保存進入位置偏好。
- 前往上次閱讀時，如果最新訊息在可視區域下方，顯示底部 toast。
- 前往最新訊息時，如果上次閱讀訊息在可視區域上方，顯示頂部 toast。
- `loadSurrounding(targetId)` 模擬以指定訊息為中心做 lazy load。
- 支援向上與向下追加訊息。
- 使用 `react-virtuoso` 虛擬化 50,000 則模擬訊息，DOM 只保留可視範圍附近內容。
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

## Demo 常數

- 總訊息：50,000
- Last read message：12,430
- Newest message：50,000
