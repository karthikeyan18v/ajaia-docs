import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db/client';
import { decideRequest } from '@/server/docs/requests';
import { AppError } from '@/server/http/errors';
import { authed, readJson } from '@/server/http/handler';

export const runtime = 'nodejs';

const input = z.object({ decision: z.enum(['approve', 'deny']) });

export const PATCH = authed<{ id: string; reqId: string }>(async (req, user, { id, reqId }) => {
  if (!z.uuid().safeParse(reqId).success) throw new AppError('NOT_FOUND', 'That request doesn’t exist.');
  const body = input.parse(await readJson(req, 1024));
  return NextResponse.json(await decideRequest(db(), id, user, reqId, body.decision));
});
