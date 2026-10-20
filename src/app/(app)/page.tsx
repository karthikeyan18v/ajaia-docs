import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ImportButton } from '@/components/dashboard/ImportButton';
import { NewDocButton } from '@/components/dashboard/NewDocButton';
import { DocCard } from '@/components/dashboard/DocCard';
import { getCurrentUser } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { listForUser } from '@/server/docs/service';

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
    <main className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[14px] text-ink-faint">{greeting()}, {user.name.split(' ')[0]}</p>
          <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight">Your documents</h1>
        </div>
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
        <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((d) => (
            <DocCard key={d.id} doc={d} />
          ))}
        </ul>
      )}
    </main>
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

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
