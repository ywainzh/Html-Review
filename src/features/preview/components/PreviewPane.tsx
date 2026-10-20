import { useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import styles from './PreviewPane.module.css';

interface PreviewPaneProps {
  html: string;
  onBack: () => void;
}

export function PreviewPane({ html, onBack }: PreviewPaneProps) {
  const toolbarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    toolbarRef.current?.querySelector('button')?.focus({ preventScroll: true });
  }, []);

  return (
    <main className={styles.preview}>
      <header className={styles.toolbar} ref={toolbarRef}>
        <Button variant="plain" onClick={onBack}>
          <Icon name="back" />
          返回编辑
        </Button>
      </header>
      <div
        className={styles.viewport}
        role="region"
        aria-label="网页预览"
        tabIndex={0}
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
