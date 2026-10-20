import 'server-only';
import { getSchema } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { extensions } from '@/lib/editor/extensions';
import { AppError } from '@/server/http/errors';

const schema = getSchema(extensions);

// Rejects anything the editor schema can't represent (unknown nodes, marks,
// bad nesting), so stored content is always renderable and never carries
// injected HTML.
export function assertValidDoc(json: unknown): object {
  if (!json || typeof json !== 'object' || (json as { type?: unknown }).type !== 'doc') {
    throw new AppError('UNPROCESSABLE', 'That document content is not valid.');
  }
  try {
    Node.fromJSON(schema, json).check();
  } catch {
    throw new AppError('UNPROCESSABLE', 'That document content is not valid.');
  }
  return json as object;
}
