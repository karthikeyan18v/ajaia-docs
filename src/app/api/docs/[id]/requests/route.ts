import { NextResponse } from 'next/server';
import { db } from '@/server/db/client';
import { requestEdit } from '@/server/docs/requests';
import { authed } from '@/server/http/handler';

export const runtime = 'nodejs';

// A viewer asks the owner for edit access.
export const POST = authed<{ id: string }>(async (_req, user, { id }) => {
  return NextResponse.json({ request: await requestEdit(db(), id, user) }, { status: 201 });
});
