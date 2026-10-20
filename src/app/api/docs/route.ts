import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db/client';
import { createDoc } from '@/server/docs/service';
import { authed, readJson } from '@/server/http/handler';
import { title } from '@/lib/validation';

export const runtime = 'nodejs';

const input = z.object({ title: title.optional() });

export const POST = authed(async (req, user) => {
  const body = input.parse(await readJson(req, 4096));
  const doc = await createDoc(db(), user.id, { title: body.title });
  return NextResponse.json({ id: doc.id }, { status: 201 });
});
