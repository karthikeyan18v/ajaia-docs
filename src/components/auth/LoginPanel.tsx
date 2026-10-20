'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button, Spinner } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { api, safeNext } from '@/lib/api-client';
import { DEMO_PASSWORD, DEMO_USERS } from '@/lib/demo-users';

export function LoginPanel({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // email being signed in, or 'form'
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function signIn(creds: { email: string; password: string }, key: string) {
    setBusy(key);
    setError(null);
    setFields({});
    const res = await api('/api/auth/login', { method: 'POST', json: creds });
    if (res.ok) {
      router.replace(safeNext(next));
      router.refresh();
      return;
    }
    setBusy(null);
    if (res.error.fields) setFields(res.error.fields);
    else setError(res.error.message);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    signIn({ email, password }, 'form');
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Sign in</h1>
        <p className="text-ink-soft">Pick a demo account to explore sharing, or use your own.</p>
      </div>

      <section aria-labelledby="demo-heading" className="flex flex-col gap-2">
        <h2 id="demo-heading" className="text-[13px] font-medium text-ink-soft">
          Demo accounts
        </h2>
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
          {DEMO_USERS.map((u) => (
            <li key={u.email}>
              <button
                type="button"
                onClick={() => signIn({ email: u.email, password: DEMO_PASSWORD }, u.email)}
                disabled={busy !== null}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-panel focus-visible:bg-panel disabled:opacity-60"
              >
                <Avatar name={u.name} idKey={u.email} size={34} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium text-ink">{u.name}</span>
                  <span className="truncate text-[13px] text-ink-soft">{u.blurb}</span>
                </span>
                {busy === u.email ? (
                  <Spinner />
                ) : (
                  <span aria-hidden className="text-ink-faint">
                    →
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center gap-3 text-[13px] text-ink-faint">
        <span className="h-px flex-1 bg-line" />
        or with email
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fields.email}
          required
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fields.password}
          required
        />
        <p role="alert" aria-live="polite" className="min-h-0 text-[14px] text-danger empty:hidden">
          {error}
        </p>
        <Button type="submit" variant="primary" pending={busy === 'form'} disabled={busy !== null}>
          Sign in
        </Button>
      </form>

      <p className="text-center text-ink-soft">
        New here?{' '}
        <Link href="/signup" className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          Create an account
        </Link>
      </p>
    </div>
  );
}
