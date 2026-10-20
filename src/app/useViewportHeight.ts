import { useEffect } from 'react';

/** iOS keyboards resize the visual viewport, not necessarily CSS dvh. */
export function useViewportHeight() {
  useEffect(() => {
    const viewport = window.visualViewport;

    function updateHeight() {
      if (viewport && viewport.scale !== 1) return;

      document.documentElement.style.setProperty(
        '--app-height',
        `${viewport?.height ?? window.innerHeight}px`,
      );
    }

    updateHeight();
    viewport?.addEventListener('resize', updateHeight);
    window.addEventListener('resize', updateHeight);

    return () => {
      viewport?.removeEventListener('resize', updateHeight);
      window.removeEventListener('resize', updateHeight);
      document.documentElement.style.removeProperty('--app-height');
    };
  }, []);
}
