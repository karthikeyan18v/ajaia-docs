'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/lib/api-client';

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setFields({});
    const res = await api('/api/auth/signup', { method: 'POST', json: form });
    if (res.ok) {
      router.replace('/');
      router.refresh();
      return;
    }
    setPending(false);
    if (res.error.fields) setFields(res.error.fields);
    else setError(res.error.message);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Create your account</h1>
        <p className="text-ink-soft">Your documents are private until you share them.</p>
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField label="Name" name="name" autoComplete="name" value={form.name} onChange={set('name')} error={fields.name} />
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={set('email')}
          error={fields.email}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={fields.password}
          hint="At least 8 characters."
        />
        <p role="alert" aria-live="polite" className="text-[14px] text-danger empty:hidden">
          {error}
        </p>
        <Button type="submit" variant="primary" pending={pending}>
          Create account
        </Button>
      </form>
      <p className="text-center text-ink-soft">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          Sign in
        </Link>
      </p>
    </div>
  );
}
