'use client';

import { generateHTML } from '@tiptap/html';
import { useEffect, useRef, useState } from 'react';
import { Button, Spinner } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { api } from '@/lib/api-client';
import { extensions } from '@/lib/editor/extensions';
import { clockTime, relativeTime } from '@/lib/time';

type Version = {
  versionNo: number;
  kind: 'created' | 'imported' | 'edit' | 'restore';
  authorName: string | null;
  restoredFrom: number | null;
  saveCount: number;
  createdAt: string;
  updatedAt: string;
};

const KIND_LABEL: Record<Version['kind'], string> = {
  created: 'Created',
  imported: 'Imported',
  edit: 'Edited',
  restore: 'Restored',
};

// Every author's editing session is a version; version 1 is the original.
// Restoring copies an old version on top, so nothing is ever lost.
export function HistoryPanel({
  open,
  onClose,
  docId,
  canRestore,
  beforeRestore,
}: {
  open: boolean;
  onClose: () => void;
  docId: string;
  canRestore: boolean;
  beforeRestore: () => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    if (!open) return;
    setVersions(null);
    setSelected(null);
    setPreview(null);
    setError(null);
    api<{ versions: Version[] }>(`/api/docs/${docId}/versions`).then((res) => {
      if (res.ok) setVersions(res.data.versions);
      else setError(res.error.message);
    });
  }, [open, docId]);

  async function select(n: number) {
    setSelected(n);
    setPreview(null);
    const res = await api<{ content: object }>(`/api/docs/${docId}/versions/${n}`);
    if (res.ok) setPreview(generateHTML(res.data.content as Parameters<typeof generateHTML>[0], extensions));
    else setError(res.error.message);
  }

  async function restore(n: number) {
    setRestoring(true);
    setError(null);
    await beforeRestore();
    const res = await api(`/api/docs/${docId}/versions/${n}`, { method: 'POST' });
    if (res.ok) {
      window.location.reload();
      return;
    }
    setRestoring(false);
    setError(res.error.message);
  }

  const current = versions?.[0]?.versionNo;
  const chosen = versions?.find((v) => v.versionNo === selected) ?? null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="history-title"
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-[460px] border-l border-line bg-paper p-0 text-ink backdrop:bg-ink/25"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id="history-title" className="text-[18px] font-semibold">
              Version history
            </h2>
            <p className="text-[13px] text-ink-faint">Each person’s editing session is kept. Nothing is overwritten.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-m-2 grid size-10 place-items-center rounded text-ink-soft hover:bg-panel hover:text-ink">
            ×
          </button>
        </div>

        {error ? (
          <p role="alert" className="mx-5 mt-4 text-[14px] text-danger">
            {error}
          </p>
        ) : null}

        {chosen ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel px-5 py-3">
              <button type="button" onClick={() => setSelected(null)} className="text-[14px] text-ink-soft hover:text-ink">
                ← All versions
              </button>
              {canRestore && chosen.versionNo !== current ? (
                <Button size="sm" variant="primary" pending={restoring} onClick={() => restore(chosen.versionNo)}>
                  Restore this version
                </Button>
              ) : null}
            </div>
            <p className="px-5 pt-4 text-[13px] text-ink-soft">
              Version {chosen.versionNo} · {chosen.authorName ?? 'Unknown'} · {clockTime(chosen.updatedAt)}
              {canRestore && chosen.versionNo !== current ? ' · The current text stays in history if you restore.' : ''}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {preview === null ? (
                <Spinner />
              ) : (
                <div className="doc-content text-[15px]" dangerouslySetInnerHTML={{ __html: preview }} />
              )}
            </div>
          </div>
        ) : (
          <ol className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {versions === null && !error ? (
              <li className="px-3 py-4">
                <Spinner />
              </li>
            ) : null}
            {versions?.map((v) => (
              <li key={v.versionNo}>
                <button
                  type="button"
                  onClick={() => select(v.versionNo)}
                  className="flex w-full flex-col gap-1 rounded-[var(--radius-control)] px-3 py-3 text-left transition-colors duration-150 hover:bg-panel"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium tabular-nums">v{v.versionNo}</span>
                    <span className="text-ink-soft">
                      {KIND_LABEL[v.kind]} by {v.authorName ?? 'Unknown'}
                    </span>
                    {v.versionNo === 1 ? <Chip tone="mark">Original</Chip> : null}
                    {v.versionNo === current ? <Chip tone="outline">Current</Chip> : null}
                    {v.restoredFrom ? <Chip>Restored from v{v.restoredFrom}</Chip> : null}
                  </span>
                  <span className="text-[13px] text-ink-faint">
                    {relativeTime(v.updatedAt)}
                    {v.saveCount > 1 ? ` · ${v.saveCount} saves` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </dialog>
  );
}
