'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api-client';

export function UserMenu({ user }: { user: { id: string; name: string; email: string } }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await api('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="flex items-center gap-2" title={user.email}>
        <Avatar name={user.name} idKey={user.email} size={28} />
        <span className="hidden text-[14px] text-ink-soft sm:inline">{user.name}</span>
      </span>
      <Button variant="ghost" size="sm" onClick={signOut} pending={pending}>
        Switch user
      </Button>
    </div>
  );
}
