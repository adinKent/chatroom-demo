import styled from '@emotion/styled';

const Toast = styled.button<{ edge: 'top' | 'bottom' }>`
  position: absolute;
  ${({ edge }) => (edge === 'top' ? 'top: 76px;' : 'bottom: 84px;')}
  left: 50%;
  z-index: 6;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100% - 32px);
  padding: 10px 14px;
  border: 1px solid #d7d8e8;
  border-radius: 999px;
  background: rgb(255 255 255 / 96%);
  box-shadow: 0 10px 30px rgb(15 23 42 / 16%);
  color: #32334a;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  backdrop-filter: blur(10px);

  &:hover {
    background: #f5f4ff;
  }
`;

interface Props {
  edge: 'top' | 'bottom';
  label: string;
  onClick: () => void;
}

export function JumpToast({ edge, label, onClick }: Props) {
  return (
    <Toast edge={edge} onClick={onClick}>
      <span aria-hidden="true">{edge === 'top' ? '↑' : '↓'}</span>
      {label}
    </Toast>
  );
}
