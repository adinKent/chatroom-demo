import styled from '@emotion/styled';

const Spacer = styled.div`
  width: 116px;
  height: 33px;
  flex-shrink: 0;
  pointer-events: none;
`;

/**
 * In Electron mode, window controls (minimize, maximize, close) are rendered in an
 * independent BrowserView overlaid at the top-right corner of the window.
 * This component acts as a layout spacer to ensure Toolbar buttons do not overlap
 * with the independent BrowserView.
 */
export function WindowControls() {
  if (!window.electronAPI) return null;
  return <Spacer aria-hidden="true" />;
}
