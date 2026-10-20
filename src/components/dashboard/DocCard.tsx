import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { relativeTime } from '@/lib/time';
import type { DocListItem } from '@/server/docs/service';

// A document shown as a page: its real opening lines on a paper thumbnail,
// with ownership and permission underneath.
export function DocCard({ doc }: { doc: DocListItem }) {
  const isOwner = doc.role === 'owner';
  return (
    <li>
      <Link href={`/d/${doc.id}`} className="group flex flex-col gap-3 rounded-[var(--radius-panel)] outline-offset-4">
        <div className="paper relative aspect-[4/3] overflow-hidden rounded-[var(--radius-panel)] px-5 pt-5 transition-[box-shadow,translate] duration-200 ease-[cubic-bezier(0.2,0,0,1)] group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-lift)]">
          {doc.preview.length === 0 ? (
            <p className="font-serif text-[13px] italic text-ink-faint">Empty document</p>
          ) : (
            <div className="flex flex-col gap-1.5 font-serif">
              {doc.preview.map((b, i) =>
                b.kind === 'h' ? (
                  <p key={i} className="line-clamp-1 text-[14px] font-semibold leading-snug text-ink">
                    {b.text}
                  </p>
                ) : (
                  <p key={i} className={`line-clamp-2 text-[11.5px] leading-[1.55] text-ink-soft ${b.kind === 'li' ? 'pl-3 before:-ml-3 before:mr-1.5 before:content-["•"]' : ''}`}>
                    {b.text}
                  </p>
                ),
              )}
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-paper to-transparent" />
          {isOwner ? null : (
            <span className="absolute right-3 top-3">
              <Chip tone={doc.role === 'editor' ? 'mark' : 'outline'}>{doc.role === 'editor' ? 'Can edit' : 'View only'}</Chip>
            </span>
          )}
        </div>
        <div className="flex items-start gap-2.5 px-0.5">
          <Avatar name={doc.ownerName} idKey={doc.ownerId} size={24} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-ink group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4">
              {doc.title}
            </span>
            <span className="truncate text-[12.5px] text-ink-faint">
              {isOwner ? 'You' : doc.ownerName.split(' ')[0]} · edited {relativeTime(doc.updatedAt)}
              {doc.updatedByName && !isOwner ? '' : doc.updatedByName ? ` by ${doc.updatedByName.split(' ')[0]}` : ''}
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}
