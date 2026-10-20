import { describe, expect, it } from 'vitest';
import { createPreviewDocument } from './createPreviewDocument';

function parse(source: string) {
  return new DOMParser().parseFromString(source, 'text/html');
}

describe('createPreviewDocument', () => {
  it('wraps fragments in a standards-mode mobile document', () => {
    const result = parse(createPreviewDocument('<h1>你好，世界</h1>'));

    expect(result.doctype?.name).toBe('html');
    expect(result.body.querySelector('h1')?.textContent).toBe('你好，世界');
    expect(
      result.head
        .querySelector('meta[name="viewport"]')
        ?.getAttribute('content'),
    ).toBe('width=device-width, initial-scale=1');
  });

  it('preserves a complete document and its existing viewport', () => {
    const source =
      '<!DOCTYPE html><html lang="en"><head><title>Demo</title><meta name="VIEWPORT" content="width=980"></head><body class="demo"><p>Hello</p></body></html>';
    const result = parse(createPreviewDocument(source));

    expect(result.documentElement.lang).toBe('en');
    expect(result.title).toBe('Demo');
    expect(result.body.className).toBe('demo');
    expect(result.querySelectorAll('meta[name]')).toHaveLength(1);
    expect(result.querySelector('meta')?.content).toBe('width=980');
  });

  it('retains inline scripts, styles and remote resources without executing code', () => {
    const script = 'window.__previewTest = true; const less = 1 < 2;';
    const source = `<style>body { color: red; }</style><link rel="stylesheet" href="https://cdn.example.test/site.css"><script>${script}</script><script src="https://cdn.example.test/site.js"></script><p>你好 &amp; hello</p>`;
    const result = parse(createPreviewDocument(source));

    expect(result.querySelector('style')?.textContent).toBe(
      'body { color: red; }',
    );
    expect(result.querySelector('script')?.textContent).toBe(script);
    expect(result.querySelector('script[src]')?.getAttribute('src')).toBe(
      'https://cdn.example.test/site.js',
    );
    expect(result.querySelector('link')?.getAttribute('href')).toBe(
      'https://cdn.example.test/site.css',
    );
    expect(result.querySelector('p')?.textContent).toBe('你好 & hello');
    expect('__previewTest' in window).toBe(false);
  });

  it('does not confuse comments, templates or JavaScript strings with a viewport', () => {
    const source = `<!-- <meta name="viewport"> --><script>const example = '<meta name="viewport">';</script><template><meta name="viewport"></template><h1>Content</h1>`;
    const result = parse(createPreviewDocument(source));

    expect(
      result.head.querySelector<HTMLMetaElement>('meta[name="viewport"]')
        ?.content,
    ).toBe('width=device-width, initial-scale=1');
    expect(result.querySelector('script')?.textContent).toContain(
      '\'<meta name="viewport">\'',
    );
  });

  it('keeps custom doctypes, document comments and character entities', () => {
    const source =
      '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><!-- document --><html><body><pre>&lt;div&gt;中文&lt;/div&gt;</pre></body></html>';
    const result = createPreviewDocument(source);
    const document = parse(result);

    expect(document.doctype?.publicId).toBe(
      '-//W3C//DTD XHTML 1.0 Transitional//EN',
    );
    expect(result).toContain('<!-- document -->');
    expect(document.querySelector('pre')?.textContent).toBe('<div>中文</div>');
  });

  it('handles malformed but browser-readable HTML and is idempotent', () => {
    const result = createPreviewDocument('<h1>标题<p>内容');

    expect(parse(result).body.textContent).toBe('标题内容');
    expect(createPreviewDocument(result)).toBe(result);
  });
});
