import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { AppError } from '@/server/http/errors';
import { MAX_IMPORT_BYTES, convertToDoc, detectKind, titleFromFileName } from '@/server/import/convert';

type JSONNode = { type: string; text?: string; attrs?: Record<string, unknown>; marks?: { type: string }[]; content?: JSONNode[] };

const enc = (s: string) => new TextEncoder().encode(s);

function walk(node: JSONNode, out: JSONNode[] = []): JSONNode[] {
  out.push(node);
  node.content?.forEach((c) => walk(c, out));
  return out;
}
const allText = (doc: object) =>
  walk(doc as JSONNode)
    .map((n) => n.text ?? '')
    .join('');

async function expectAppError(p: Promise<unknown> | (() => unknown), code: string) {
  try {
    await (typeof p === 'function' ? p() : p);
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    expect((e as AppError).code).toBe(code);
    return e as AppError;
  }
  throw new Error(`expected AppError ${code}`);
}

// jszip is not a direct dependency; borrow it from mammoth's tree (pnpm keeps it nested).
function loadJSZip(): (new () => { file(name: string, data: string): void; generateAsync(o: { type: 'uint8array' }): Promise<Uint8Array> }) | null {
  try {
    const req = createRequire(import.meta.url);
    return createRequire(req.resolve('mammoth'))('jszip');
  } catch {
    return null;
  }
}
const JSZip = loadJSZip();

async function makeDocx(bodyXml: string): Promise<Uint8Array> {
  const zip = new JSZip!();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: 'uint8array' });
}

describe('titleFromFileName', () => {
  it('strips the extension and path', () => {
    expect(titleFromFileName('My Notes.md')).toBe('My Notes');
    expect(titleFromFileName('C:\\docs\\plan  v2.docx')).toBe('plan v2');
    expect(titleFromFileName('a/b/report.txt')).toBe('report');
  });
  it('falls back when nothing is left', () => {
    expect(titleFromFileName('.md')).toBe('Untitled document');
    expect(titleFromFileName('   ')).toBe('Untitled document');
  });
  it('caps the length at 200', () => {
    expect(titleFromFileName('x'.repeat(300) + '.txt')).toHaveLength(200);
  });
});

describe('detectKind', () => {
  it('accepts the supported extensions', () => {
    expect(detectKind('a.txt', enc('hi'))).toBe('txt');
    expect(detectKind('a.MD', enc('# hi'))).toBe('md');
    expect(detectKind('a.markdown', enc('# hi'))).toBe('md');
    expect(detectKind('a.docx', new Uint8Array([0x50, 0x4b, 3, 4, 0]))).toBe('docx');
  });
  it('rejects a .pdf', async () => {
    await expectAppError(() => detectKind('a.pdf', enc('%PDF-1.7')), 'UNSUPPORTED_MEDIA_TYPE');
  });
  it('rejects a .docx without zip magic', async () => {
    const err = await expectAppError(() => detectKind('a.docx', enc('not a zip')), 'UNSUPPORTED_MEDIA_TYPE');
    expect(err.message).toBe('Only .txt, .md and .docx files can be imported.');
  });
  it('rejects a binary .txt', async () => {
    await expectAppError(() => detectKind('a.txt', new Uint8Array([0x68, 0x00, 0x69])), 'UNSUPPORTED_MEDIA_TYPE');
    await expectAppError(() => detectKind('a.md', new Uint8Array([0xff, 0xfe, 0xfd])), 'UNSUPPORTED_MEDIA_TYPE');
  });
});

describe('convertToDoc', () => {
  it('turns txt into paragraphs and keeps markup-looking text literal', async () => {
    const res = await convertToDoc('notes.txt', enc('First <b>line</b>\nsecond line\n\nNext para'));
    expect(res.kind).toBe('txt');
    expect(res.title).toBe('notes');
    const doc = res.content as JSONNode;
    expect(doc.type).toBe('doc');
    const paras = doc.content!;
    expect(paras.map((p) => p.type)).toEqual(['paragraph', 'paragraph']);
    expect(walk(paras[0]).some((n) => n.type === 'hardBreak')).toBe(true);
    expect(allText(paras[0])).toBe('First <b>line</b>second line');
    expect(walk(doc).some((n) => n.marks?.some((m) => m.type === 'bold'))).toBe(false);
    expect(allText(paras[1])).toBe('Next para');
  });

  it('maps markdown headings, marks and lists to schema nodes', async () => {
    const md = '# Title\n\n## Sub\n\nSome **bold** and *italic* text.\n\n- one\n- two\n\n1. first\n';
    const res = await convertToDoc('doc.md', enc(md));
    const nodes = walk(res.content as JSONNode);
    const headings = nodes.filter((n) => n.type === 'heading');
    expect(headings.map((h) => h.attrs?.level)).toEqual([1, 2]);
    const marked = (t: string) => nodes.find((n) => n.text === t)?.marks?.map((m) => m.type);
    expect(marked('bold')).toEqual(['bold']);
    expect(marked('italic')).toEqual(['italic']);
    expect(nodes.filter((n) => n.type === 'bulletList')).toHaveLength(1);
    expect(nodes.filter((n) => n.type === 'orderedList')).toHaveLength(1);
    expect(nodes.filter((n) => n.type === 'listItem')).toHaveLength(3);
    expect(res.warnings).toEqual([]);
  });

  it('drops scripts and warns about images', async () => {
    const md = 'Hello\n\n<script>alert(1)</script>\n\n![cat](http://x/cat.png) <img src="http://x/y.png">\n\nBye';
    const res = await convertToDoc('x.md', enc(md));
    const text = allText(res.content);
    expect(text).not.toContain('alert');
    expect(text).toContain('Hello');
    expect(text).toContain('Bye');
    expect(res.warnings).toContain('Images were not imported.');
  });

  it('warns that tables become plain text', async () => {
    const res = await convertToDoc('t.md', enc('| a | b |\n|---|---|\n| 1 | 2 |\n'));
    expect(allText(res.content)).toContain('1');
    expect(res.warnings).toContain('Tables were imported as plain text.');
  });

  it('clamps h5 to heading level 3', async () => {
    const res = await convertToDoc('h.md', enc('##### Deep'));
    const heading = walk(res.content as JSONNode).find((n) => n.type === 'heading');
    expect(heading?.attrs?.level).toBe(3);
  });

  it('rejects oversize files with 413', async () => {
    const err = await expectAppError(convertToDoc('big.txt', new Uint8Array(MAX_IMPORT_BYTES + 1).fill(0x61)), 'PAYLOAD_TOO_LARGE');
    expect(err.status).toBe(413);
    expect(err.message).toBe('Files can be up to 2 MB.');
  });

  it('rejects empty files with 422', async () => {
    const err = await expectAppError(convertToDoc('e.txt', new Uint8Array()), 'UNPROCESSABLE');
    expect(err.status).toBe(422);
    expect(err.message).toBe('That file is empty.');
  });

  it('rejects files with no importable text', async () => {
    const err = await expectAppError(convertToDoc('ws.md', enc('   \n\n<script>x</script>\n')), 'UNPROCESSABLE');
    expect(err.message).toBe('That file has no text we can import.');
  });

  it('rejects unsupported types before converting', async () => {
    await expectAppError(convertToDoc('a.pdf', enc('%PDF')), 'UNSUPPORTED_MEDIA_TYPE');
  });

  (JSZip ? it : it.skip)('converts a minimal docx', async () => {
    const bytes = await makeDocx(
      '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Bold start</w:t></w:r><w:r><w:t xml:space="preserve"> then plain</w:t></w:r></w:p><w:p><w:r><w:t>Second</w:t></w:r></w:p>',
    );
    const res = await convertToDoc('Quarterly Plan.docx', bytes);
    expect(res.kind).toBe('docx');
    expect(res.title).toBe('Quarterly Plan');
    const nodes = walk(res.content as JSONNode);
    expect(nodes.filter((n) => n.type === 'paragraph')).toHaveLength(2);
    expect(nodes.find((n) => n.text === 'Bold start')?.marks?.map((m) => m.type)).toEqual(['bold']);
    expect(allText(res.content)).toBe('Bold start then plainSecond');
  });

  (JSZip ? it : it.skip)('rejects a corrupt docx as unreadable', async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3, 4, 5, 6]);
    const err = await expectAppError(convertToDoc('bad.docx', bytes), 'UNPROCESSABLE');
    expect(err.message).toBe('We couldn’t read that file.');
  });
});
