import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import styles from './PreviewPane.module.css';

interface PreviewPaneProps {
  html: string;
  onExit: () => void;
}

export function PreviewPane({ html, onExit }: PreviewPaneProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    viewportRef.current?.focus({ preventScroll: true });
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return;

    event.preventDefault();
    onExit();
  }

  return (
    <main className={styles.preview}>
      <div
        ref={viewportRef}
        className={styles.viewport}
        role="region"
        aria-label="网页预览"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <iframe
          className={styles.frame}
          title="HTML 页面预览"
          srcDoc={html}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
        />
      </div>
    </main>
  );
}
