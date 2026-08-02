import { memo } from 'react';
import styled from '@emotion/styled';
import { MessageImage } from './MessageImage';
import type { ChatMessage } from '../types';

const Row = styled.article<{ highlighted: boolean }>`
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 10px;
  padding: 9px 18px;
  background: ${({ highlighted }) => (highlighted ? '#fff8db' : 'transparent')};
  transition: background 160ms ease;
`;

const Avatar = styled.div`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #e7e6f7;
  color: #4f52a8;
  font-size: 12px;
  font-weight: 800;
`;

/** Teams 的未讀分隔線：一條橫線，標籤靠右。 */
const UnreadDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px 2px;
  color: #c4314b;
  font-size: 12px;
  font-weight: 700;

  &::before {
    content: '';
    flex: 1;
    height: 1px;
    background: #c4314b;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
`;

const Time = styled.time`
  color: #77798b;
  font-size: 12px;
`;

const Bubble = styled.div<{ mine: boolean }>`
  width: fit-content;
  max-width: min(720px, 92%);
  margin-top: 4px;
  padding: 10px 12px;
  border-radius: 4px 12px 12px 12px;
  background: ${({ mine }) => (mine ? '#e9e8ff' : '#fff')};
  box-shadow: 0 1px 2px rgb(15 23 42 / 8%);
  line-height: 1.55;
  overflow-wrap: anywhere;
`;

interface Props {
  message: ChatMessage;
  highlighted: boolean;
  /** 這則是第一則未讀訊息，上方要畫分隔線。 */
  firstUnread: boolean;
}

export const MessageItem = memo(function MessageItem({ message, highlighted, firstUnread }: Props) {
  const time = new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(message.sentAt));

  return (
    <>
      {firstUnread && <UnreadDivider data-testid="unread-divider">上次閱讀</UnreadDivider>}
      <Row highlighted={highlighted} data-message-id={message.id}>
        <Avatar aria-hidden="true">{message.avatar}</Avatar>
        <div>
          <Header>
            <strong>{message.author}</strong>
            <Time dateTime={message.sentAt}>{time}</Time>
          </Header>
          <Bubble mine={message.isMine}>
            {message.text}
            {message.imageUrl && <MessageImage url={message.imageUrl} />}
          </Bubble>
        </div>
      </Row>
    </>
  );
});
