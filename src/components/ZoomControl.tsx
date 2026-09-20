import styled from '@emotion/styled';

const ZoomGroup = styled.div`
  display: inline-flex;
  align-items: center;
  border: 1px solid #d7d8e3;
  border-radius: 9px;
  background: #fff;
  overflow: hidden;
  user-select: none;
`;

const ZoomButton = styled.button`
  display: grid;
  place-items: center;
  width: 30px;
  height: 33px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #34354b;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms ease;

  &:hover:not(:disabled) {
    background: #f4f3ff;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const ZoomIndicator = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  height: 33px;
  padding: 0 4px;
  border: 0;
  border-left: 1px solid #ececf3;
  border-right: 1px solid #ececf3;
  background: transparent;
  color: #34354b;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background 120ms ease;

  &:hover {
    background: #f4f3ff;
    color: #5b5fc7;
  }
`;

interface Props {
  percentage: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function ZoomControl({
  percentage,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: Props) {
  return (
    <ZoomGroup role="group" aria-label="縮放控制">
      <ZoomButton
        type="button"
        disabled={!canZoomOut}
        onClick={onZoomOut}
        title="縮小 (Cmd/Ctrl -)"
        aria-label="縮小"
      >
        −
      </ZoomButton>
      <ZoomIndicator
        type="button"
        onClick={onResetZoom}
        title="重設縮放為 100% (Cmd/Ctrl 0)"
        aria-label={`目前縮放 ${percentage}%，點選重設`}
      >
        {percentage}%
      </ZoomIndicator>
      <ZoomButton
        type="button"
        disabled={!canZoomIn}
        onClick={onZoomIn}
        title="放大 (Cmd/Ctrl +)"
        aria-label="放大"
      >
        +
      </ZoomButton>
    </ZoomGroup>
  );
}

