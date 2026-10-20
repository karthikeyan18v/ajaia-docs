import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db/client';
import { setLinkAccess } from '@/server/docs/requests';
import { authed, readJson } from '@/server/http/handler';

export const runtime = 'nodejs';

const input = z.object({ linkAccess: z.enum(['restricted', 'link_view']) });

export const PUT = authed<{ id: string }>(async (req, user, { id }) => {
  const body = input.parse(await readJson(req, 1024));
  return NextResponse.json(await setLinkAccess(db(), id, user, body.linkAccess));
});
