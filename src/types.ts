export type EntryMode = 'last-read' | 'newest';

export interface ChatMessage {
  id: number;
  author: string;
  avatar: string;
  sentAt: string;
  text: string;
  isMine: boolean;
}

export interface LoadedWindow {
  messages: ChatMessage[];
  firstId: number;
  lastId: number;
  hasOlder: boolean;
  hasNewer: boolean;
}
