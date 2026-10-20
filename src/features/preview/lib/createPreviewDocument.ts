const DEFAULT_VIEWPORT = 'width=device-width, initial-scale=1';

/** Prepare an isolated document without changing the editable source. */
export function createPreviewDocument(source: string): string {
  const document = new DOMParser().parseFromString(source, 'text/html');
  const hasViewport = Array.from(document.querySelectorAll('meta[name]')).some(
    (meta) => meta.getAttribute('name')?.toLowerCase() === 'viewport',
  );

  if (!hasViewport) {
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = DEFAULT_VIEWPORT;
    document.head.prepend(viewport);
  }

  if (!document.doctype) {
    document.insertBefore(
      document.implementation.createDocumentType('html', '', ''),
      document.firstChild,
    );
  }

  const serializer = new XMLSerializer();
  const markup = Array.from(document.childNodes, (node) =>
    node === document.documentElement
      ? document.documentElement.outerHTML
      : serializer.serializeToString(node),
  ).join('');

  return markup;
}
