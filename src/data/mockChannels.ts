export interface MockMessage {
  id: number;
  sender: string;
  avatarColor: string;
  timestamp: string;
  content: string;
}

export interface Channel {
  id: string;
  name: string;
  category: '釘選' | '近期';
  tag: string;
  color: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  is50kDemo?: boolean;
  topic?: string;
  sampleMessages?: MockMessage[];
}

export const MOCK_CHANNELS: Channel[] = [
  {
    id: 'project-discussion',
    name: '專案討論',
    category: '釘選',
    tag: 'TD',
    color: '#5b5fc7',
    lastMessage: '林小美: 好的，我稍後在下個 sprint 規劃中提出...',
    timestamp: '14:32',
    unreadCount: 0,
    is50kDemo: true,
    topic: '50,000 則模擬訊息 · 虛擬滾動與錨點補償驗證',
  },
  {
    id: 'announcements',
    name: '產品公告',
    category: '釘選',
    tag: 'PA',
    color: '#0f6cbd',
    lastMessage: '陳經理: 本週五下午將進行系統維護與升級...',
    timestamp: '11:05',
    unreadCount: 2,
    topic: '公司內部重要產品里程碑與發布公告',
    sampleMessages: [
      {
        id: 1,
        sender: '陳經理',
        avatarColor: '#0f6cbd',
        timestamp: '10:30',
        content: '📢 各組同仁請注意：Q3 產品發布進度總結會議將於今日下午 3 點召開。',
      },
      {
        id: 2,
        sender: '系統公告機器人',
        avatarColor: '#6264a7',
        timestamp: '10:45',
        content: '🔔 自動化提醒：請確認本週各自負責模組的測試報告已更新至 Jira。',
      },
      {
        id: 3,
        sender: '陳經理',
        avatarColor: '#0f6cbd',
        timestamp: '11:05',
        content: '本週五下午將進行系統維護與升級，預計停機約 30 分鐘，請大家提前儲存手邊工作。',
      },
    ],
  },
  {
    id: 'frontend-arch',
    name: '前端架構組',
    category: '近期',
    tag: 'FE',
    color: '#107c41',
    lastMessage: '張工程師: React 19 與 Electron 效能調優進展順利！',
    timestamp: '昨天',
    unreadCount: 5,
    topic: 'React 19、Electron 44、Virtuoso 虛擬化與架構探討',
    sampleMessages: [
      {
        id: 1,
        sender: '張工程師',
        avatarColor: '#107c41',
        timestamp: '昨天 15:20',
        content: '大家測試過最新的 react-virtuoso 搭配雙向滾動與反向捲動的表現了嗎？',
      },
      {
        id: 2,
        sender: '王資深架構師',
        avatarColor: '#2b88d8',
        timestamp: '昨天 15:35',
        content: '在 50,000 筆長列表下，圖片撐開時的 scroll anchor 補償邏輯非常穩定，沒有任何抖動。',
      },
      {
        id: 3,
        sender: '李前端工程師',
        avatarColor: '#0078d4',
        timestamp: '昨天 16:10',
        content: 'Electron 的 frameless 模式加上獨立 BrowserView 控制視窗按鈕，整體體驗跟原生 Teams 幾乎無異。',
      },
      {
        id: 4,
        sender: '張工程師',
        avatarColor: '#107c41',
        timestamp: '昨天 17:00',
        content: 'React 19 與 Electron 效能調優進展順利！我們會繼續把各項指標壓到 60fps。',
      },
    ],
  },
  {
    id: 'design-system',
    name: 'UI/UX 設計討論',
    category: '近期',
    tag: 'UI',
    color: '#b146c2',
    lastMessage: '王設計師: 最新的微軟 Fluent Design 規範已更新在 Figma',
    timestamp: '昨天',
    unreadCount: 0,
    topic: 'Microsoft Fluent 2 設計語言、色彩、元件標準',
    sampleMessages: [
      {
        id: 1,
        sender: '王設計師',
        avatarColor: '#b146c2',
        timestamp: '昨天 09:15',
        content: '各位好，我們整理了 Teams 左側邊欄在不同解析度下的收合 (collapse) 動態曲線。',
      },
      {
        id: 2,
        sender: '林設計師',
        avatarColor: '#ea4c89',
        timestamp: '昨天 10:22',
        content: '未讀訊息 badge 的顏色與半徑已統一參照 Fluent 2 規範，在明亮模式與暗色模式下都有足夠對比度。',
      },
      {
        id: 3,
        sender: '王設計師',
        avatarColor: '#b146c2',
        timestamp: '昨天 14:10',
        content: '最新的微軟 Fluent Design 規範已更新在 Figma，大家有空可以上去預覽！',
      },
    ],
  },
  {
    id: 'bug-tracker',
    name: 'Bug 追蹤與回報',
    category: '近期',
    tag: 'BG',
    color: '#c4314b',
    lastMessage: '系統機器人: [Alert] Virtuoso scroll anchor 補償測試已全數通過',
    timestamp: '09/18',
    unreadCount: 1,
    topic: '自動化測試、Issue 回報與修復進度追蹤',
    sampleMessages: [
      {
        id: 1,
        sender: 'QA 測試員',
        avatarColor: '#c4314b',
        timestamp: '09/18 10:00',
        content: '回報一個已解決的測試：滾輪向上滾動時，原先圖片載入可能偶發回彈，經 anchor 補償調整後已完全正常。',
      },
      {
        id: 2,
        sender: '系統機器人',
        avatarColor: '#881798',
        timestamp: '09/18 10:05',
        content: '[Alert] Virtuoso scroll anchor 補償測試已全數通過，CDP smoke test 綠燈。',
      },
    ],
  },
  {
    id: 'random-coffee',
    name: '茶水間閒聊',
    category: '近期',
    tag: 'CF',
    color: '#008272',
    lastMessage: '李專員: 下午有要一起訂手搖飲嗎？🧋',
    timestamp: '09/17',
    unreadCount: 0,
    topic: '輕鬆聊聊、團購手搖飲、生活雜談',
    sampleMessages: [
      {
        id: 1,
        sender: '黃專員',
        avatarColor: '#008272',
        timestamp: '09/17 13:45',
        content: '今天天氣好好，大家下午精神如何？',
      },
      {
        id: 2,
        sender: '李專員',
        avatarColor: '#d13438',
        timestamp: '09/17 14:02',
        content: '下午有要一起訂手搖飲嗎？🧋 點單開在 Slack/Teams，兩點半截單喔！',
      },
    ],
  },
];

