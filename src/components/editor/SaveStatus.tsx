'use client';

import { useEffect, useState } from 'react';
import type { SaveStatus as Status } from '@/lib/autosave/engine';
import { relativeTime } from '@/lib/time';

export function SaveStatus({ status, onRetry }: { status: Status; onRetry: () => void }) {
  // Re-render each 30 s so "Saved just now" ages honestly.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  let content;
  switch (status.kind) {
    case 'saving':
    case 'dirty':
      content = <span className="text-ink-faint">Saving…</span>;
      break;
    case 'saved':
      content = (
        <span className="flex items-center gap-1.5 text-ink-faint">
          <span aria-hidden className="size-1.5 rounded-full bg-ok" />
          {status.at ? `Saved ${relativeTime(new Date(status.at))}` : 'All changes saved'}
        </span>
      );
      break;
    case 'error':
      content = (
        <span className="flex items-center gap-2 text-danger">
          Couldn’t save
          <button type="button" onClick={onRetry} className="font-medium underline underline-offset-2">
            Retry
          </button>
        </span>
      );
      break;
    case 'conflict':
      content = <span className="text-danger">Not saved: newer version exists</span>;
      break;
    case 'forbidden':
      content = <span className="text-danger">View only</span>;
      break;
  }
  return (
    <span role="status" aria-live="polite" className="text-[13px] whitespace-nowrap">
      {content}
    </span>
  );
}
