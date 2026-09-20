import { useState, useMemo } from 'react';
import styled from '@emotion/styled';
import type { Channel } from '../data/mockChannels';

interface ChannelSidePanelProps {
  channels: Channel[];
  activeChannelId: string;
  onSelectChannel: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const PanelContainer = styled.aside<{ isCollapsed: boolean }>`
  display: flex;
  flex-direction: column;
  width: ${({ isCollapsed }) => (isCollapsed ? '64px' : '280px')};
  min-width: ${({ isCollapsed }) => (isCollapsed ? '64px' : '280px')};
  height: 100%;
  background: #f0f0f4;
  border-right: 1px solid #dedee8;
  transition: width 200ms ease, min-width 200ms ease;
  overflow: hidden;
  user-select: none;
`;

const PanelHeader = styled.div<{ isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ isCollapsed }) => (isCollapsed ? 'center' : 'space-between')};
  height: 68px;
  min-height: 68px;
  padding: ${({ isCollapsed }) => (isCollapsed ? '0' : '0 14px')};
  border-bottom: 1px solid #dedee8;
  background: #f8f8fa;
  -webkit-app-region: drag;
  box-sizing: border-box;
`;

const HeaderTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TeamsBadge = styled.div`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #5b5fc7;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #242424;
`;

const IconButton = styled.button`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #5b5fc7;
  cursor: pointer;
  transition: all 120ms ease;
  -webkit-app-region: no-drag;

  &:hover {
    background: #e4e4ed;
    border-color: #d7d7e2;
  }

  svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
`;

const SearchContainer = styled.div`
  padding: 10px 12px 6px;
  -webkit-app-region: no-drag;
`;

const SearchInput = styled.input`
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #d7d8e3;
  border-radius: 8px;
  background: #fff;
  color: #242424;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 150ms ease, box-shadow 150ms ease;

  &:focus {
    border-color: #5b5fc7;
    box-shadow: 0 0 0 1px #5b5fc7;
  }

  &::placeholder {
    color: #8a8a9a;
  }
`;

const ChannelList = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 0;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #c1c2d0;
    border-radius: 4px;
  }
`;

const CategoryLabel = styled.div`
  padding: 8px 14px 4px;
  font-size: 11px;
  font-weight: 700;
  color: #77798b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ChannelItem = styled.div<{ active: boolean; isCollapsed: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: ${({ isCollapsed }) => (isCollapsed ? '10px 0' : '10px 14px')};
  justify-content: ${({ isCollapsed }) => (isCollapsed ? 'center' : 'flex-start')};
  cursor: pointer;
  background: ${({ active }) => (active ? '#edebe9' : 'transparent')};
  border-left: 3px solid ${({ active }) => (active ? '#5b5fc7' : 'transparent')};
  transition: background 120ms ease;
  -webkit-app-region: no-drag;

  &:hover {
    background: ${({ active }) => (active ? '#edebe9' : '#e4e4ed')};
  }
`;

const Avatar = styled.div<{ color: string }>`
  position: relative;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ color }) => color};
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
`;

const CollapsedUnreadDot = styled.div`
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #5b5fc7;
  border: 2px solid #f0f0f4;
`;

const ChannelInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
`;

const ChannelName = styled.span<{ active: boolean }>`
  font-size: 13px;
  font-weight: ${({ active }) => (active ? '700' : '600')};
  color: #242424;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Timestamp = styled.span`
  font-size: 11px;
  color: #77798b;
  flex-shrink: 0;
`;

const MessageRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
`;

const MessagePreview = styled.span`
  font-size: 12px;
  color: #616161;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UnreadBadge = styled.span`
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #5b5fc7;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
`;

export function ChannelSidePanel({
  channels,
  activeChannelId,
  onSelectChannel,
  isCollapsed,
  onToggleCollapse,
}: ChannelSidePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(
      (c) => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)
    );
  }, [channels, searchQuery]);

  const pinnedChannels = useMemo(
    () => filteredChannels.filter((c) => c.category === '釘選'),
    [filteredChannels]
  );
  const recentChannels = useMemo(
    () => filteredChannels.filter((c) => c.category === '近期'),
    [filteredChannels]
  );

  return (
    <PanelContainer isCollapsed={isCollapsed} role="navigation" aria-label="聊天室頻道清單">
      <PanelHeader isCollapsed={isCollapsed}>
        {!isCollapsed && (
          <HeaderTitleGroup>
            <TeamsBadge>T</TeamsBadge>
            <HeaderTitle>聊天</HeaderTitle>
          </HeaderTitleGroup>
        )}
        <IconButton
          type="button"
          onClick={onToggleCollapse}
          title={isCollapsed ? '展開側邊欄' : '收合側邊欄'}
          aria-label={isCollapsed ? '展開側邊欄' : '收合側邊欄'}
        >
          {isCollapsed ? (
            <svg viewBox="0 0 16 16">
              <path
                fillRule="evenodd"
                d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16">
              <path
                fillRule="evenodd"
                d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"
              />
            </svg>
          )}
        </IconButton>
      </PanelHeader>

      {!isCollapsed && (
        <SearchContainer>
          <SearchInput
            type="search"
            placeholder="搜尋頻道或訊息..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="搜尋頻道或訊息"
          />
        </SearchContainer>
      )}

      <ChannelList>
        {pinnedChannels.length > 0 && (
          <>
            {!isCollapsed && <CategoryLabel>釘選</CategoryLabel>}
            {pinnedChannels.map((channel) => {
              const active = channel.id === activeChannelId;
              return (
                <ChannelItem
                  key={channel.id}
                  active={active}
                  isCollapsed={isCollapsed}
                  onClick={() => onSelectChannel(channel.id)}
                  title={channel.name}
                  role="button"
                  tabIndex={0}
                >
                  <Avatar color={channel.color}>
                    {channel.tag}
                    {isCollapsed && channel.unreadCount > 0 && <CollapsedUnreadDot />}
                  </Avatar>
                  {!isCollapsed && (
                    <ChannelInfo>
                      <TitleRow>
                        <ChannelName active={active}>{channel.name}</ChannelName>
                        <Timestamp>{channel.timestamp}</Timestamp>
                      </TitleRow>
                      <MessageRow>
                        <MessagePreview>{channel.lastMessage}</MessagePreview>
                        {channel.unreadCount > 0 && (
                          <UnreadBadge>{channel.unreadCount}</UnreadBadge>
                        )}
                      </MessageRow>
                    </ChannelInfo>
                  )}
                </ChannelItem>
              );
            })}
          </>
        )}

        {recentChannels.length > 0 && (
          <>
            {!isCollapsed && <CategoryLabel>近期</CategoryLabel>}
            {recentChannels.map((channel) => {
              const active = channel.id === activeChannelId;
              return (
                <ChannelItem
                  key={channel.id}
                  active={active}
                  isCollapsed={isCollapsed}
                  onClick={() => onSelectChannel(channel.id)}
                  title={channel.name}
                  role="button"
                  tabIndex={0}
                >
                  <Avatar color={channel.color}>
                    {channel.tag}
                    {isCollapsed && channel.unreadCount > 0 && <CollapsedUnreadDot />}
                  </Avatar>
                  {!isCollapsed && (
                    <ChannelInfo>
                      <TitleRow>
                        <ChannelName active={active}>{channel.name}</ChannelName>
                        <Timestamp>{channel.timestamp}</Timestamp>
                      </TitleRow>
                      <MessageRow>
                        <MessagePreview>{channel.lastMessage}</MessagePreview>
                        {channel.unreadCount > 0 && (
                          <UnreadBadge>{channel.unreadCount}</UnreadBadge>
                        )}
                      </MessageRow>
                    </ChannelInfo>
                  )}
                </ChannelItem>
              );
            })}
          </>
        )}
      </ChannelList>
    </PanelContainer>
  );
}

