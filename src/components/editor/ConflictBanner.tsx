'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

// Shown when a save was rejected because someone saved a newer version.
// Neither choice destroys work: "Load theirs" copies your text to the
// clipboard first, and "Keep mine" leaves their save in version history.
export function ConflictBanner({
  who,
  when,
  onLoadTheirs,
  onKeepMine,
}: {
  who: string;
  when: string | null;
  onLoadTheirs: () => Promise<void>;
  onKeepMine: () => void;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <div role="alert" className="mb-6 flex flex-col gap-3 rounded-[var(--radius-panel)] border border-danger/40 bg-danger-soft px-4 py-3 text-[14px]">
      <p>
        <strong className="font-medium">{who}</strong> saved this document{when ? ` at ${when}` : ''} while you were editing.
        Your latest changes aren’t saved yet.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          pending={loading}
          onClick={async () => {
            setLoading(true);
            await onLoadTheirs();
            setLoading(false);
          }}
        >
          Load their version
        </Button>
        <Button size="sm" variant="primary" onClick={onKeepMine}>
          Keep mine
        </Button>
      </div>
      <p className="text-[13px] text-ink-soft">Loading theirs copies your text to the clipboard first.</p>
    </div>
  );
}
