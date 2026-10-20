import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db/client';
import { deleteDoc, getDocWithAccess, renameDoc, saveContent } from '@/server/docs/service';
import { assertValidDoc } from '@/server/docs/validate';
import { authed, readJson } from '@/server/http/handler';
import { title } from '@/lib/validation';

export const runtime = 'nodejs';

// 512 KB of editor JSON is a very long document; it keeps version rows small.
const MAX_SAVE_BYTES = 512 * 1024;

const input = z.union([
  z.object({ content: z.unknown(), baseRevision: z.number().int().min(1) }),
  z.object({ title }),
]);

// Latest saved copy, used by the editor's "Load their version" after a conflict.
export const GET = authed<{ id: string }>(async (_req, user, { id }) => {
  const { doc } = await getDocWithAccess(db(), id, user.id);
  return NextResponse.json({ title: doc.title, content: doc.content, revision: doc.revision });
});

export const PATCH = authed<{ id: string }>(async (req, user, { id }) => {
  const body = input.parse(await readJson(req, MAX_SAVE_BYTES));
  if ('title' in body) {
    const row = await renameDoc(db(), id, user, body.title);
    return NextResponse.json(row);
  }
  const content = assertValidDoc(body.content);
  const saved = await saveContent(db(), id, user, content, body.baseRevision);
  return NextResponse.json(saved);
});

export const DELETE = authed<{ id: string }>(async (_req, user, { id }) => {
  await deleteDoc(db(), id, user);
  return new NextResponse(null, { status: 204 });
});
