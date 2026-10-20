'use client';

import type { Editor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { createAutosave, type Autosave, type SaveOutcome, type SaveStatus } from '@/lib/autosave/engine';

// Browsers cap keepalive request bodies at 64 KB; larger docs use a normal fetch.
const KEEPALIVE_LIMIT = 60 * 1024;

async function patchContent(docId: string, content: unknown, baseRevision: number, keepalive: boolean): Promise<SaveOutcome> {
  const body = JSON.stringify({ content, baseRevision });
  try {
    const res = await fetch(`/api/docs/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: keepalive && body.length < KEEPALIVE_LIMIT,
    });
    const json = await res.json().catch(() => null);
    if (res.ok) return { ok: true, revision: json.revision };
    return {
      ok: false,
      status: res.status,
      message: json?.error?.message ?? 'Couldn’t save.',
      current: json?.error?.current,
    };
  } catch {
    return { ok: false, status: 0, message: 'You’re offline. Changes will save when you reconnect.' };
  }
}

export function useAutosave(editor: Editor | null, docId: string, initialRevision: number, enabled: boolean) {
  const [status, setStatus] = useState<SaveStatus>({ kind: 'saved', at: null });
  const ref = useRef<Autosave | null>(null);

  useEffect(() => {
    if (!editor || !enabled) return;
    const auto = createAutosave({
      initialRevision,
      getContent: () => editor.getJSON(),
      save: (content, base, { keepalive }) => patchContent(docId, content, base, keepalive),
      onStatus: setStatus,
    });
    ref.current = auto;

    const onUpdate = ({ transaction }: { transaction: { getMeta(k: string): unknown } }) => {
      if (transaction.getMeta('remote')) return; // content we loaded from the server
      auto.edit();
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') void auto.flush({ keepalive: true });
    };
    const onPageHide = () => void auto.flush({ keepalive: true });
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const k = auto.status.kind;
      if (k === 'dirty' || k === 'saving' || k === 'error') e.preventDefault();
    };
    const onOnline = () => auto.retry();

    editor.on('update', onUpdate);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('online', onOnline);
    return () => {
      void auto.flush({ keepalive: true });
      editor.off('update', onUpdate);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('online', onOnline);
      // Let the final flush finish before the engine stops.
      setTimeout(() => auto.dispose(), 15_000);
      ref.current = null;
    };
  }, [editor, docId, initialRevision, enabled]);

  return { status, autosave: ref };
}
