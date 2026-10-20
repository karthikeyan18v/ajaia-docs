import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hit } from '@/server/auth/rate-limit';
import { db } from '@/server/db/client';
import { shareDoc } from '@/server/docs/service';
import { AppError } from '@/server/http/errors';
import { authed, readJson } from '@/server/http/handler';
import { email } from '@/lib/validation';

export const runtime = 'nodejs';

const input = z.object({ email, role: z.enum(['editor', 'viewer']).default('viewer') });

// Adds a person or changes their role (upsert). Owner only.
export const POST = authed<{ id: string }>(async (req, user, { id }) => {
  const body = input.parse(await readJson(req, 4096));
  if (!(await hit(db(), `share:${user.id}`, 30, 10 * 60))) {
    throw new AppError('RATE_LIMITED', 'Too many sharing changes. Wait a few minutes and try again.');
  }
  const result = await shareDoc(db(), id, user, body.email, body.role);
  return NextResponse.json({ member: result.member }, { status: result.created ? 201 : 200 });
});
