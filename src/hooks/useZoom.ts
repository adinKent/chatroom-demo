import { useCallback, useEffect, useState } from 'react';

const ZOOM_KEY = 'teams-chat-demo-zoom-factor';
export const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2.0;

function getStoredZoom(): number {
  const raw = localStorage.getItem(ZOOM_KEY);
  if (!raw) return 1.0;
  const parsed = Number.parseFloat(raw);
  if (Number.isFinite(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
    return Math.round(parsed * 100) / 100;
  }
  return 1.0;
}

export function useZoom() {
  const [zoomFactor, setZoomFactor] = useState<number>(getStoredZoom);

  // Apply zoom to document (for web fallback) or call Electron IPC
  const applyZoom = useCallback(async (factor: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(factor * 100) / 100));
    setZoomFactor(clamped);
    localStorage.setItem(ZOOM_KEY, String(clamped));

    if (window.electronAPI) {
      await window.electronAPI.setZoomFactor(clamped);
    } else {
      // In standard web browser, use CSS zoom property supported across modern browsers
      (document.documentElement.style as unknown as { zoom: string }).zoom = String(clamped);
    }
  }, []);

  const zoomIn = useCallback(() => {
    if (window.electronAPI) {
      void window.electronAPI.zoomIn().then((factor) => {
        setZoomFactor(factor);
        localStorage.setItem(ZOOM_KEY, String(factor));
      });
    } else {
      const next = ZOOM_STEPS.find((step) => step > zoomFactor + 0.01) ?? MAX_ZOOM;
      void applyZoom(next);
    }
  }, [applyZoom, zoomFactor]);

  const zoomOut = useCallback(() => {
    if (window.electronAPI) {
      void window.electronAPI.zoomOut().then((factor) => {
        setZoomFactor(factor);
        localStorage.setItem(ZOOM_KEY, String(factor));
      });
    } else {
      const next = [...ZOOM_STEPS].reverse().find((step) => step < zoomFactor - 0.01) ?? MIN_ZOOM;
      void applyZoom(next);
    }
  }, [applyZoom, zoomFactor]);

  const resetZoom = useCallback(() => {
    if (window.electronAPI) {
      void window.electronAPI.resetZoom().then((factor) => {
        setZoomFactor(factor);
        localStorage.setItem(ZOOM_KEY, String(factor));
      });
    } else {
      void applyZoom(1.0);
    }
  }, [applyZoom]);

  // Initial sync & Electron IPC listener
  useEffect(() => {
    if (window.electronAPI) {
      const initial = getStoredZoom();
      void window.electronAPI.setZoomFactor(initial);
      const unsubscribe = window.electronAPI.onZoomChanged((factor) => {
        const rounded = Math.round(factor * 100) / 100;
        setZoomFactor(rounded);
        localStorage.setItem(ZOOM_KEY, String(rounded));
      });
      return unsubscribe;
    } else {
      const initial = getStoredZoom();
      if (initial !== 1.0) {
        (document.documentElement.style as unknown as { zoom: string }).zoom = String(initial);
      }
    }
  }, []);

  // Keyboard shortcuts for browser mode and Electron
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom]);

  return {
    zoomFactor,
    percentage: Math.round(zoomFactor * 100),
    canZoomIn: zoomFactor < MAX_ZOOM - 0.01,
    canZoomOut: zoomFactor > MIN_ZOOM + 0.01,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom: applyZoom,
  };
}

