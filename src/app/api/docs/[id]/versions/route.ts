import { NextResponse } from 'next/server';
import { db } from '@/server/db/client';
import { listVersions } from '@/server/docs/history';
import { authed } from '@/server/http/handler';

export const runtime = 'nodejs';

export const GET = authed<{ id: string }>(async (_req, user, { id }) => {
  return NextResponse.json({ versions: await listVersions(db(), id, user) });
});
