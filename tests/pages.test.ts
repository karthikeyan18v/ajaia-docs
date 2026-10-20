import { describe, expect, it } from 'vitest';
import { joinPages, pageLabel, splitPages } from '@/lib/editor/pages';

const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const h = (text: string) => ({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text }] });

describe('document pages', () => {
  it('splits on page breaks and joins back losslessly', () => {
    const doc = { type: 'doc', content: [h('Intro'), p('a'), { type: 'pageBreak' }, p('b')] };
    const pages = splitPages(doc);
    expect(pages).toHaveLength(2);
    expect(joinPages(pages)).toEqual(doc);
  });

  it('treats a doc without breaks as one page', () => {
    expect(splitPages({ type: 'doc', content: [p('only')] })).toHaveLength(1);
  });

  it('gives empty pages a paragraph so the editor can focus them', () => {
    const pages = splitPages({ type: 'doc', content: [p('a'), { type: 'pageBreak' }] });
    expect(pages[1]).toEqual([{ type: 'paragraph' }]);
  });

  it('labels pages by heading, then first line, then number', () => {
    expect(pageLabel([p('first line'), h('Plan')], 0)).toBe('Plan');
    expect(pageLabel([p('first line')], 0)).toBe('first line');
    expect(pageLabel([{ type: 'paragraph' }], 2)).toBe('Page 3');
  });
});
