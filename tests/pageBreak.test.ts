import { getSchema } from '@tiptap/core';
import { generateHTML, generateJSON } from '@tiptap/html/server';
import { Node } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { extensions } from '@/lib/editor/extensions';

const schema = getSchema(extensions);
const twoPages = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Page one' }] },
    { type: 'pageBreak' },
    { type: 'paragraph', content: [{ type: 'text', text: 'Page two' }] },
  ],
};

describe('page breaks', () => {
  it('are valid in the shared schema, so the server accepts multi-page saves', () => {
    expect(() => Node.fromJSON(schema, twoPages).check()).not.toThrow();
  });

  it('round-trip through HTML (used by version previews)', () => {
    const html = generateHTML(twoPages, extensions);
    expect(html).toContain('data-page-break');
    expect(generateJSON(html, extensions)).toEqual(twoPages);
  });
});
