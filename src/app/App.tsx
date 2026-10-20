import { PreviewPane } from '../features/preview/components/PreviewPane';
import { SourceEditor } from '../features/preview/components/SourceEditor';
import { useHtmlPreview } from '../features/preview/hooks/useHtmlPreview';
import { useViewportHeight } from './useViewportHeight';

export function App() {
  useViewportHeight();
  const { draft, setDraft, snapshot, isPreview, openPreview, closePreview } =
    useHtmlPreview();

  return (
    <>
      <SourceEditor
        value={draft}
        visible={!isPreview}
        onChange={setDraft}
        onPreview={openPreview}
      />
      {isPreview && snapshot && (
        <PreviewPane
          key={snapshot.id}
          html={snapshot.document}
          onBack={closePreview}
        />
      )}
    </>
  );
}
