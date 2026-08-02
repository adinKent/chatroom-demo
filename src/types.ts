export type EntryMode = 'last-read' | 'newest';

export interface ChatMessage {
  id: number;
  author: string;
  avatar: string;
  sentAt: string;
  text: string;
  isMine: boolean;
  /** 後端只提供連結，尺寸由前端量測。 */
  imageUrl?: string;
}

export interface LoadedWindow {
  messages: ChatMessage[];
  firstId: number;
  lastId: number;
  hasOlder: boolean;
  hasNewer: boolean;
}
