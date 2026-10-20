import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createPreviewDocument } from '../lib/createPreviewDocument';

interface PreviewSnapshot {
  id: number;
  document: string;
}

interface PreviewHistoryState {
  htmlPreview: string;
  snapshotId: number | null;
}

function isPreviewState(value: unknown): value is PreviewHistoryState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'htmlPreview' in value &&
    typeof value.htmlPreview === 'string' &&
    'snapshotId' in value &&
    (value.snapshotId === null || typeof value.snapshotId === 'number')
  );
}

export function useHtmlPreview() {
  const [draft, setDraft] = useState('');
  const [sessionId] = useState(
    () => `preview-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [snapshot, setSnapshot] = useState<PreviewSnapshot | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const latestSnapshot = useRef<PreviewSnapshot | null>(null);
  const revision = useRef(0);

  useEffect(() => {
    const editorState: PreviewHistoryState = {
      htmlPreview: sessionId,
      snapshotId: null,
    };

    // Source never enters browser history or persistent storage.
    window.history.replaceState(editorState, '');

    function handlePopState(event: PopStateEvent) {
      const state: unknown = event.state;
      const canRestore =
        isPreviewState(state) &&
        state.htmlPreview === sessionId &&
        state.snapshotId !== null &&
        state.snapshotId === latestSnapshot.current?.id;

      setIsPreview(canRestore);

      if (!canRestore) {
        window.history.replaceState(editorState, '');
      }
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [sessionId]);

  const openPreview = useCallback(() => {
    if (!draft.trim() || isPreview) return;

    const nextSnapshot = {
      id: ++revision.current,
      document: createPreviewDocument(draft),
    };
    const historyState: PreviewHistoryState = {
      htmlPreview: sessionId,
      snapshotId: nextSnapshot.id,
    };

    latestSnapshot.current = nextSnapshot;
    window.history.pushState(historyState, '');
    setSnapshot(nextSnapshot);
    setIsPreview(true);
  }, [draft, isPreview, sessionId]);

  const closePreview = useCallback(() => {
    const state: unknown = window.history.state;

    if (
      isPreviewState(state) &&
      state.htmlPreview === sessionId &&
      state.snapshotId !== null
    ) {
      // Unmount first: iframe-only history traversal may not emit a host popstate.
      flushSync(() => setIsPreview(false));
      window.history.back();
    } else {
      setIsPreview(false);
    }
  }, [sessionId]);

  return { draft, setDraft, snapshot, isPreview, openPreview, closePreview };
}
