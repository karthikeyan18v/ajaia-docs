'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api-client';

export function NewDocButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setPending(true);
    setError(null);
    const res = await api<{ id: string }>('/api/docs', { method: 'POST', json: {} });
    if (res.ok) {
      router.push(`/d/${res.data.id}?new=1`);
      return;
    }
    setPending(false);
    setError(res.error.message);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="primary" onClick={create} pending={pending}>
        New document
      </Button>
      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
