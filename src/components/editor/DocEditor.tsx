'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShareDialog, type LinkAccess, type Member, type PendingRequest } from '@/components/share/ShareDialog';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { api } from '@/lib/api-client';
import { extensions } from '@/lib/editor/extensions';
import { clockTime } from '@/lib/time';
import { ConflictBanner } from './ConflictBanner';
import { HistoryPanel } from './HistoryPanel';
import { SaveStatus } from './SaveStatus';
import { TitleField } from './TitleField';
import { Toolbar } from './Toolbar';
import { useAutosave } from './useAutosave';
import { ViewerBanner } from './ViewerBanner';

type Role = 'owner' | 'editor' | 'viewer';
type Notice = { imported: string; warnings: string[] } | { created: true } | null;

export function DocEditor({
  doc,
  role,
  viaLink,
  owner,
  me,
  sharing,
  myRequest,
  notice,
}: {
  doc: { id: string; title: string; content: object; revision: number };
  role: Role;
  viaLink: boolean;
  owner: { id: string; name: string };
  me: { id: string; name: string; email: string };
  sharing: { members: Member[]; linkAccess: LinkAccess; requests: PendingRequest[] };
  myRequest: 'pending' | 'approved' | 'denied' | null;
  notice: Notice;
}) {
  const [pendingCount, setPendingCount] = useState(sharing.requests.length);
  const router = useRouter();
  const [canEdit, setCanEdit] = useState(role !== 'viewer');
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [banner, setBanner] = useState<Notice>(notice);

  const editor = useEditor({
    extensions: [...extensions, Placeholder.configure({ placeholder: 'Start writing…' })],
    content: doc.content,
    editable: canEdit,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: { class: 'doc-content min-h-[50vh] pb-24', 'aria-label': 'Document body', spellcheck: 'true' },
    },
  });

  const { status, autosave } = useAutosave(editor, doc.id, doc.revision, role !== 'viewer');

  // Lost edit access mid-session (owner downgraded us): stop editing.
  useEffect(() => {
    if (status.kind === 'forbidden') {
      setCanEdit(false);
      editor?.setEditable(false);
    }
  }, [status.kind, editor]);

  // New blank doc: put the cursor in the title so you can name it first.
  useEffect(() => {
    if (notice && 'created' in notice) router.replace(`/d/${doc.id}`, { scroll: false });
    if (notice && 'imported' in notice) router.replace(`/d/${doc.id}`, { scroll: false });
  }, [notice, doc.id, router]);

  // Ctrl/Cmd+S saves now instead of opening the browser's save dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void autosave.current?.flush();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [autosave]);

  const goBack = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      await autosave.current?.flush();
      router.push('/');
      router.refresh();
    },
    [autosave, router],
  );

  const loadTheirs = useCallback(async () => {
    if (!editor) return;
    const mine = editor.getText();
    await navigator.clipboard?.writeText(mine).catch(() => {});
    const res = await api<{ content: object; revision: number }>(`/api/docs/${doc.id}`);
    if (!res.ok) return;
    editor.chain().setMeta('addToHistory', false).setMeta('remote', true).setContent(res.data.content, { emitUpdate: false }).run();
    autosave.current?.resolveTakeTheirs(res.data.revision);
  }, [editor, doc.id, autosave]);

  // "Save as PDF" from the print dialog. The print stylesheet keeps only the
  // title and pages; page breaks become real PDF pages. The tab title becomes
  // the suggested file name.
  const downloadPdf = useCallback(async () => {
    await autosave.current?.flush();
    const previous = document.title;
    const heading = document.querySelector<HTMLInputElement>('[aria-label="Document title"]')?.value;
    document.title = heading || doc.title;
    window.print();
    document.title = previous;
  }, [autosave, doc.title]);

  const roleChip = useMemo(() => {
    if (role === 'owner') return null;
    return <Chip tone="outline">{canEdit ? 'Can edit' : 'View only'}</Chip>;
  }, [role, canEdit]);

  return (
    <div className="flex flex-1 flex-col">
      <div data-print-hide className="sticky top-14 z-10 bg-canvas/90 backdrop-blur-[6px]">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-2 px-4 py-2 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" onClick={goBack} className="flex h-9 items-center gap-1 text-[14px] text-ink-soft hover:text-ink max-sm:h-11">
              <span aria-hidden>←</span> Documents
            </Link>
            <div className="flex items-center gap-3">
              {canEdit ? <SaveStatus status={status} onRetry={() => autosave.current?.retry()} /> : roleChip}
              <Button variant="ghost" size="sm" onClick={downloadPdf} aria-label="Download as PDF">
                PDF
              </Button>
              {role !== 'viewer' ? (
                <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)} aria-label="Version history">
                  History
                </Button>
              ) : null}
              {role === 'owner' ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShareOpen(true)}
                  aria-label={pendingCount ? `Share, ${pendingCount} access request${pendingCount > 1 ? 's' : ''}` : 'Share'}
                  className="relative"
                >
                  Share
                  {pendingCount ? (
                    <span aria-hidden className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-mark text-[11px] font-semibold text-ink">
                      {pendingCount}
                    </span>
                  ) : null}
                </Button>
              ) : canEdit ? (
                roleChip
              ) : null}
            </div>
          </div>
          {canEdit && editor ? (
            <div className="paper mx-auto w-full max-w-[860px] rounded-full px-2 py-1 max-sm:rounded-[var(--radius-panel)]">
              <Toolbar editor={editor} />
            </div>
          ) : null}
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-0 pb-16 pt-4 sm:px-6 sm:pt-6">
        <div data-print-root className="paper mx-auto min-h-[80vh] max-w-[860px] px-5 pb-16 pt-8 sm:rounded-[var(--radius-panel)] sm:px-16 sm:pt-14">
          {banner && 'imported' in banner ? (
            <Notice onClose={() => setBanner(null)}>
              Imported <strong className="font-medium">{banner.imported}</strong>. Review the formatting below.
              {banner.warnings.length ? <span className="block text-ink-soft">{banner.warnings.join(' ')}</span> : null}
            </Notice>
          ) : null}

          {!canEdit ? (
            <ViewerBanner
              docId={doc.id}
              owner={owner}
              viaLink={viaLink}
              initialRequest={myRequest}
              lostAccess={role !== 'viewer'}
            />
          ) : null}

          {status.kind === 'conflict' ? (
            <ConflictBanner
              who={status.current.updatedBy?.name ?? 'Someone'}
              when={status.current.updatedAt ? clockTime(status.current.updatedAt) : null}
              onLoadTheirs={loadTheirs}
              onKeepMine={() => autosave.current?.resolveKeepMine(status.current.revision)}
            />
          ) : null}

          <TitleField docId={doc.id} initialTitle={doc.title} canEdit={canEdit} autoFocus={!!notice && 'created' in notice} />

          {editor ? (
            <EditorContent editor={editor} className="mt-4" />
          ) : (
            <div aria-hidden className="mt-4 flex flex-col gap-3">
              {[92, 80, 86, 60].map((w) => (
                <div key={w} className="h-4 animate-pulse rounded bg-panel" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
        </div>
      </main>

      {role !== 'viewer' ? (
        <HistoryPanel
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          docId={doc.id}
          canRestore={role === 'owner'}
          beforeRestore={async () => {
            await autosave.current?.flush();
          }}
        />
      ) : null}

      {role === 'owner' ? (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          docId={doc.id}
          owner={{ ...me }}
          initialMembers={sharing.members}
          initialLinkAccess={sharing.linkAccess}
          initialRequests={sharing.requests}
          onRequestsChange={setPendingCount}
        />
      ) : null}
    </div>
  );
}

function Notice({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div data-print-hide role="status" className="mb-6 flex items-start justify-between gap-3 rounded-[var(--radius-panel)] bg-mark-soft px-4 py-3 text-[14px]">
      <p>{children}</p>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="-m-1 grid size-8 shrink-0 place-items-center rounded text-ink-soft hover:bg-mark/40">
        ×
      </button>
    </div>
  );
}
