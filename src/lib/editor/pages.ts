// A document is stored as one Tiptap doc whose pages are separated by
// pageBreak nodes. The editor shows one page at a time, like tabs.

export type Block = { type: string; text?: string; attrs?: Record<string, unknown>; content?: Block[] };
export type Page = Block[];

const EMPTY_PAGE: Page = [{ type: 'paragraph' }];

export function splitPages(doc: unknown): Page[] {
  const blocks = ((doc as { content?: Block[] })?.content ?? []) as Block[];
  const pages: Page[] = [[]];
  for (const b of blocks) {
    if (b.type === 'pageBreak') pages.push([]);
    else pages[pages.length - 1].push(b);
  }
  return pages.map((p) => (p.length ? p : [...EMPTY_PAGE]));
}

export function joinPages(pages: Page[]): { type: 'doc'; content: Block[] } {
  const content: Block[] = [];
  pages.forEach((p, i) => {
    if (i > 0) content.push({ type: 'pageBreak' });
    content.push(...(p.length ? p : EMPTY_PAGE));
  });
  return { type: 'doc', content };
}

function textOf(b: Block): string {
  return (b.text ?? '') + (b.content ?? []).map(textOf).join('');
}

// Tab label: the page's first heading, else its first line, else "Page N".
export function pageLabel(page: Page, index: number): string {
  const heading = page.find((b) => b.type === 'heading' && textOf(b).trim());
  const first = heading ?? page.find((b) => textOf(b).trim());
  const text = first ? textOf(first).trim() : '';
  return text ? (text.length > 32 ? `${text.slice(0, 31)}…` : text) : `Page ${index + 1}`;
}
