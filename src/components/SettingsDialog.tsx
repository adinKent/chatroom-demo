import styled from '@emotion/styled';
import type { EntryMode } from '../types';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(15 23 42 / 48%);
  backdrop-filter: blur(4px);
`;

const Panel = styled.div`
  width: min(460px, 100%);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 24px 80px rgb(15 23 42 / 28%);
  overflow: hidden;
`;

const Header = styled.div`
  padding: 24px 24px 12px;
`;

const Body = styled.div`
  display: grid;
  gap: 12px;
  padding: 12px 24px 24px;
`;

const Option = styled.button<{ selected: boolean }>`
  display: grid;
  grid-template-columns: 22px 1fr;
  gap: 12px;
  width: 100%;
  padding: 16px;
  border: 1px solid ${({ selected }) => (selected ? '#5b5fc7' : '#d9dbe7')};
  border-radius: 12px;
  background: ${({ selected }) => (selected ? '#f3f2ff' : '#fff')};
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: #5b5fc7;
  }
`;

const Radio = styled.span<{ selected: boolean }>`
  width: 18px;
  height: 18px;
  margin-top: 2px;
  border: 2px solid ${({ selected }) => (selected ? '#5b5fc7' : '#7d8092')};
  border-radius: 999px;
  box-shadow: ${({ selected }) => (selected ? 'inset 0 0 0 4px #fff' : 'none')};
  background: ${({ selected }) => (selected ? '#5b5fc7' : '#fff')};
`;

const Confirm = styled.button`
  margin-top: 4px;
  padding: 12px 16px;
  border: 0;
  border-radius: 10px;
  color: #fff;
  background: #5b5fc7;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: #4f52b8;
  }
`;

interface Props {
  value: EntryMode;
  onChange: (value: EntryMode) => void;
  onConfirm: () => void;
}

export function SettingsDialog({ value, onChange, onConfirm }: Props) {
  return (
    <Backdrop role="presentation">
      <Panel role="dialog" aria-modal="true" aria-labelledby="entry-setting-title">
        <Header>
          <h2 id="entry-setting-title">第一次進入聊天室</h2>
          <p>選擇聊天室開啟時要定位的位置。</p>
        </Header>
        <Body>
          <Option selected={value === 'last-read'} onClick={() => onChange('last-read')}>
            <Radio selected={value === 'last-read'} />
            <span>
              <strong>前往上次閱讀</strong>
              <small>以 last read message 為中心載入前後訊息。</small>
            </span>
          </Option>
          <Option selected={value === 'newest'} onClick={() => onChange('newest')}>
            <Radio selected={value === 'newest'} />
            <span>
              <strong>前往最新訊息</strong>
              <small>直接從聊天室底部開始閱讀。</small>
            </span>
          </Option>
          <Confirm onClick={onConfirm}>進入聊天室</Confirm>
        </Body>
      </Panel>
    </Backdrop>
  );
}
