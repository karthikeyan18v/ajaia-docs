import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ImportButton } from '@/components/dashboard/ImportButton';
import { NewDocButton } from '@/components/dashboard/NewDocButton';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { relativeTime } from '@/lib/time';
import { getCurrentUser } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { listForUser, type DocListItem } from '@/server/docs/service';

export const metadata: Metadata = { title: 'Documents' };

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'owned', label: 'Owned by me' },
  { key: 'shared', label: 'Shared with me' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default async function DashboardPage({ searchParams }: PageProps<'/'>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { tab: rawTab } = await searchParams;
  const tab: TabKey = rawTab === 'owned' || rawTab === 'shared' ? rawTab : 'all';

  const docs = await listForUser(db(), user.id);
  const owned = docs.filter((d) => d.role === 'owner');
  const shared = docs.filter((d) => d.role !== 'owner');
  const visible = tab === 'owned' ? owned : tab === 'shared' ? shared : docs;
  const counts: Record<TabKey, number> = { all: docs.length, owned: owned.length, shared: shared.length };

  return (
    <main className="mx-auto w-full max-w-[880px] px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Documents</h1>
        <div className="flex gap-2">
          <ImportButton />
          <NewDocButton />
        </div>
      </div>

      <nav aria-label="Filter documents" className="mt-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-1 border-b border-line">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <li key={t.key}>
                <Link
                  href={t.key === 'all' ? '/' : `/?tab=${t.key}`}
                  aria-current={active ? 'page' : undefined}
                  className={
                    'relative -mb-px flex h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-[14px] transition-colors duration-150 ' +
                    (active ? 'border-ink font-medium text-ink' : 'border-transparent text-ink-soft hover:text-ink')
                  }
                >
                  {t.label}
                  <span className={`rounded-full px-1.5 text-[12px] tabular-nums ${active ? 'bg-mark' : 'bg-panel'}`}>{counts[t.key]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {visible.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {visible.map((d) => (
            <DocRow key={d.id} doc={d} />
          ))}
        </ul>
      )}
    </main>
  );
}

function DocRow({ doc }: { doc: DocListItem }) {
  const isOwner = doc.role === 'owner';
  return (
    <li>
      <Link
        href={`/d/${doc.id}`}
        className="-mx-3 flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-3.5 transition-colors duration-150 hover:bg-panel sm:gap-4"
      >
        <DocGlyph />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-serif text-[17px] font-medium text-ink">{doc.title}</span>
          <span className="truncate text-[13px] text-ink-faint">
            Edited {relativeTime(doc.updatedAt)}
            {doc.updatedByName ? ` by ${doc.updatedByName}` : ''}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {isOwner ? (
            <Chip tone="mark">Owner</Chip>
          ) : (
            <>
              <span className="hidden items-center gap-1.5 text-[13px] text-ink-soft sm:flex">
                <Avatar name={doc.ownerName} idKey={doc.ownerId} size={20} />
                {doc.ownerName.split(' ')[0]}’s
              </span>
              <Chip tone="outline">{doc.role === 'editor' ? 'Can edit' : 'View only'}</Chip>
            </>
          )}
        </span>
      </Link>
    </li>
  );
}

function DocGlyph() {
  return (
    <svg aria-hidden width="28" height="34" viewBox="0 0 28 34" className="shrink-0 text-line-strong">
      <path d="M3 1.5h15l7.5 7.5v22a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 31V3A1.5 1.5 0 0 1 3 1.5Z" fill="var(--color-paper)" stroke="currentColor" />
      <path d="M7 14h14M7 18.5h14M7 23h9" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function EmptyState({ tab }: { tab: TabKey }) {
  const copy =
    tab === 'shared'
      ? { title: 'Nothing shared with you yet', body: 'When someone shares a document with you, it shows up here.' }
      : { title: 'No documents yet', body: 'Start a blank document, or import a .txt, .md or .docx file.' };
  return (
    <div className="mt-12 flex flex-col items-start gap-2 border border-dashed border-line px-6 py-10 sm:items-center sm:text-center rounded-[var(--radius-panel)]">
      <p className="font-medium text-ink">{copy.title}</p>
      <p className="text-ink-soft">{copy.body}</p>
    </div>
  );
}
