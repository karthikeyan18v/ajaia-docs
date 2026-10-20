import { NextResponse } from 'next/server';
import { db } from '@/server/db/client';
import { createDoc } from '@/server/docs/service';
import { AppError } from '@/server/http/errors';
import { authed } from '@/server/http/handler';
import { convertToDoc, MAX_IMPORT_BYTES } from '@/server/import/convert';

export const runtime = 'nodejs';

// Upload a .txt, .md or .docx file; it becomes a new document owned by the caller.
export const POST = authed(async (req, user) => {
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_IMPORT_BYTES + 64 * 1024) throw new AppError('PAYLOAD_TOO_LARGE', 'Files can be up to 2 MB.');

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) throw new AppError('BAD_REQUEST', 'Choose a file to import.');

  const bytes = new Uint8Array(await file.arrayBuffer());
  const converted = await convertToDoc(file.name, bytes);
  const doc = await createDoc(db(), user.id, { title: converted.title, content: converted.content, kind: 'imported' });
  return NextResponse.json({ id: doc.id, warnings: converted.warnings }, { status: 201 });
});
