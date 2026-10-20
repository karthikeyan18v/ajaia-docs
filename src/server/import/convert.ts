import 'server-only';
import { getSchema } from '@tiptap/core';
import { generateJSON } from '@tiptap/html/server';
import { Node } from '@tiptap/pm/model';
import mammoth from 'mammoth';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { extensions } from '@/lib/editor/extensions';
import { AppError } from '@/server/http/errors';

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.markdown', '.docx'] as const;
export type ImportKind = 'txt' | 'md' | 'docx';

const UNSUPPORTED = 'Only .txt, .md and .docx files can be imported.';
const schema = getSchema(extensions);

// Everything the editor schema can represent; anything else is unwrapped to text.
const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'h1', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr'],
  allowedAttributes: {},
  transformTags: { h4: 'h3', h5: 'h3', h6: 'h3' },
  nonTextTags: ['script', 'style', 'iframe', 'noscript', 'textarea', 'option', 'title'],
};

function extensionOf(fileName: string) {
  const base = fileName.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(dot).toLowerCase() : '';
}

function isUtf8Text(bytes: Uint8Array) {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

// The extension says what the file claims to be; the bytes have to agree.
export function detectKind(fileName: string, bytes: Uint8Array): ImportKind {
  const ext = extensionOf(fileName);
  if (ext === '.docx') {
    const zip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    if (zip) return 'docx';
  } else if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
    if (isUtf8Text(bytes)) return ext === '.txt' ? 'txt' : 'md';
  }
  throw new AppError('UNSUPPORTED_MEDIA_TYPE', UNSUPPORTED);
}

export function titleFromFileName(fileName: string): string {
  const base = (fileName.split(/[\\/]/).pop() ?? '').trim();
  const dot = base.lastIndexOf('.');
  const stem = (dot >= 0 ? base.slice(0, dot) : base).replace(/\s+/g, ' ').trim();
  return stem ? stem.slice(0, 200) : 'Untitled document';
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function txtToHtml(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.split('\n').map(escapeHtml).join('<br>')}</p>`)
    .join('');
}

function hasText(node: { text?: string; content?: unknown[] }): boolean {
  if (node.text && node.text.trim()) return true;
  return (node.content ?? []).some((c) => hasText(c as { text?: string; content?: unknown[] }));
}

export async function convertToDoc(fileName: string, bytes: Uint8Array) {
  if (bytes.byteLength > MAX_IMPORT_BYTES) throw new AppError('PAYLOAD_TOO_LARGE', 'Files can be up to 2 MB.');
  if (bytes.byteLength === 0) throw new AppError('UNPROCESSABLE', 'That file is empty.');
  const kind = detectKind(fileName, bytes);
  const warnings = new Set<string>();

  let html: string;
  try {
    if (kind === 'txt') {
      html = txtToHtml(new TextDecoder().decode(bytes));
    } else if (kind === 'md') {
      html = marked.parse(new TextDecoder().decode(bytes), { gfm: true, async: false });
    } else {
      // mammoth's own messages are developer-facing ("style ID … not defined");
      // users only see the plain-language warnings added below.
      html = (await mammoth.convertToHtml({ buffer: Buffer.from(bytes) })).value;
    }
  } catch {
    throw new AppError('UNPROCESSABLE', 'We couldn’t read that file.');
  }

  if (/<img[\s>]/i.test(html)) warnings.add('Images were not imported.');
  if (/<table[\s>]/i.test(html)) warnings.add('Tables were imported as plain text.');

  const clean = sanitizeHtml(html, SANITIZE);
  let content: { type: string; content?: unknown[] };
  try {
    content = generateJSON(clean, extensions) as typeof content;
    Node.fromJSON(schema, content).check();
  } catch {
    throw new AppError('UNPROCESSABLE', 'We couldn’t read that file.');
  }
  if (!hasText(content)) throw new AppError('UNPROCESSABLE', 'That file has no text we can import.');

  return { title: titleFromFileName(fileName), content: content as object, kind, warnings: [...warnings].slice(0, 5) };
}
