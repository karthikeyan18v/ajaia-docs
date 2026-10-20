import { NextResponse } from 'next/server';
import { db } from '@/server/db/client';
import { unshareDoc } from '@/server/docs/service';
import { authed } from '@/server/http/handler';

export const runtime = 'nodejs';

export const DELETE = authed<{ id: string; userId: string }>(async (_req, user, { id, userId }) => {
  await unshareDoc(db(), id, user, userId);
  return new NextResponse(null, { status: 204 });
});
