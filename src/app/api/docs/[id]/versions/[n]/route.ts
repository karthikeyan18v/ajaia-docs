import { NextResponse } from 'next/server';
import { db } from '@/server/db/client';
import { getVersion, restoreVersion } from '@/server/docs/history';
import { authed } from '@/server/http/handler';

export const runtime = 'nodejs';

export const GET = authed<{ id: string; n: string }>(async (_req, user, { id, n }) => {
  return NextResponse.json(await getVersion(db(), id, user, n));
});

// POST = restore this version (owner only).
export const POST = authed<{ id: string; n: string }>(async (_req, user, { id, n }) => {
  return NextResponse.json(await restoreVersion(db(), id, user, n));
});
