import { NextResponse } from 'next/server';
import { login } from '@/server/auth/service';
import { startSession } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { readJson, route } from '@/server/http/handler';
import { loginInput } from '@/lib/validation';

export const runtime = 'nodejs';

export const POST = route(async (req) => {
  const input = loginInput.parse(await readJson(req, 4096));
  const user = await login(db(), input.email, input.password);
  await startSession(user);
  return NextResponse.json({ user });
});
