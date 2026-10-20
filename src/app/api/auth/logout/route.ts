import { NextResponse } from 'next/server';
import { endSession } from '@/server/auth/session';
import { route } from '@/server/http/handler';

export const runtime = 'nodejs';

export const POST = route(async () => {
  await endSession();
  return NextResponse.json({ ok: true });
});
