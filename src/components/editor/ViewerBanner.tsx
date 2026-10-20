'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api-client';

type RequestStatus = 'pending' | 'approved' | 'denied' | null;

// Read-only banner with a "Request edit access" flow for viewers.
export function ViewerBanner({
  docId,
  owner,
  viaLink,
  initialRequest,
  lostAccess,
}: {
  docId: string;
  owner: { id: string; name: string };
  viaLink: boolean;
  initialRequest: RequestStatus;
  lostAccess: boolean;
}) {
  const first = owner.name.split(' ')[0];
  const [status, setStatus] = useState<RequestStatus>(initialRequest);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setPending(true);
    setError(null);
    const res = await api<{ request: { status: RequestStatus } }>(`/api/docs/${docId}/requests`, { method: 'POST' });
    setPending(false);
    if (res.ok) setStatus(res.data.request.status);
    else setError(res.error.message);
  }

  let action;
  if (status === 'pending') {
    action = <span className="text-ink-soft">Requested · waiting for {first}</span>;
  } else if (status === 'approved') {
    action = (
      <Button size="sm" variant="primary" onClick={() => window.location.reload()}>
        Approved · reload to edit
      </Button>
    );
  } else {
    action = (
      <Button size="sm" variant="secondary" pending={pending} onClick={ask}>
        {status === 'denied' ? 'Request again' : 'Request edit access'}
      </Button>
    );
  }

  return (
    <div data-print-hide className="mb-6 flex flex-col gap-2 rounded-[var(--radius-panel)] bg-panel px-4 py-3 text-[14px] sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2 text-ink-soft">
        <Avatar name={owner.name} idKey={owner.id} size={22} />
        <span>
          {lostAccess ? 'Your edit access was removed' : 'View only'} · Owned by <span className="text-ink">{owner.name}</span>
          {viaLink ? ' · opened with a link' : ''}
          {status === 'denied' ? <span className="block text-ink-faint">{first} declined your last request.</span> : null}
        </span>
      </span>
      <span className="flex items-center gap-2">{action}</span>
      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
