import { useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import styles from './SourceEditor.module.css';

interface SourceEditorProps {
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onPreview: () => void;
}

export function SourceEditor({
  value,
  visible,
  onChange,
  onPreview,
}: SourceEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const position = useRef({ start: 0, end: 0, top: 0, left: 0 });
  const hasPreviewed = useRef(false);

  useEffect(() => {
    if (!visible || !hasPreviewed.current) return;

    const frame = requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;

      // Keep the selection without reopening the iOS keyboard.
      input.setSelectionRange(position.current.start, position.current.end);
      input.scrollTop = position.current.top;
      input.scrollLeft = position.current.left;
      titleRef.current?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [visible]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) return;

    const input = inputRef.current;
    if (input) {
      position.current = {
        start: input.selectionStart,
        end: input.selectionEnd,
        top: input.scrollTop,
        left: input.scrollLeft,
      };
      input.blur();
    }

    hasPreviewed.current = true;
    onPreview();
  }

  return (
    <main className={styles.page} hidden={!visible}>
      <div className={styles.workspace}>
        <header className={styles.header}>
          <span className={styles.mark}>
            <Icon name="code" />
          </span>
          <h1 className={styles.title} ref={titleRef} tabIndex={-1}>
            HTML 预览
          </h1>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="html-source" className="sr-only">
            HTML 代码
          </label>
          <textarea
            ref={inputRef}
            id="html-source"
            className={styles.input}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            wrap="off"
            aria-label="HTML 代码"
          />
          <Button type="submit" disabled={!value.trim()}>
            <Icon name="play" />
            预览
          </Button>
        </form>
      </div>
    </main>
  );
}
