import { NextResponse } from 'next/server';
import { hit } from '@/server/auth/rate-limit';
import { signup } from '@/server/auth/service';
import { startSession } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { AppError } from '@/server/http/errors';
import { readJson, route } from '@/server/http/handler';
import { signupInput } from '@/lib/validation';

export const runtime = 'nodejs';

export const POST = route(async (req) => {
  const input = signupInput.parse(await readJson(req, 4096));
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (!(await hit(db(), `signup:${ip}`, 10, 60 * 60))) {
    throw new AppError('RATE_LIMITED', 'Too many accounts created from this network. Try again later.');
  }
  const user = await signup(db(), input);
  await startSession(user);
  return NextResponse.json({ user }, { status: 201 });
});
