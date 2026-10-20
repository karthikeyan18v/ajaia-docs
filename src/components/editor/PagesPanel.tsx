'use client';

// Google Docs-style page tabs: a side list on desktop, a scrolling strip on phones.
export function PagesPanel({
  labels,
  active,
  canEdit,
  onSelect,
  onAdd,
  onDelete,
}: {
  labels: string[];
  active: number;
  canEdit: boolean;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onDelete: (i: number) => void;
}) {
  return (
    <nav aria-label="Pages" data-print-hide className="lg:sticky lg:top-[128px] lg:w-[220px] lg:shrink-0 lg:self-start">
      <div className="flex items-center justify-between px-4 pb-2 lg:px-3">
        <h2 className="text-[13px] font-medium text-ink-soft">Pages</h2>
        {canEdit ? (
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add page"
            title="Add page"
            className="grid size-9 place-items-center rounded-full text-ink-soft transition-[background-color,color,scale] duration-150 hover:bg-line/60 hover:text-ink active:scale-[0.96]"
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        ) : null}
      </div>
      <ol className="flex gap-1 overflow-x-auto px-4 pb-2 lg:flex-col lg:overflow-visible lg:px-0">
        {labels.map((label, i) => {
          const selected = i === active;
          return (
            <li key={i} className="group relative shrink-0">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={selected ? 'page' : undefined}
                className={
                  'flex h-10 w-full max-w-[220px] items-center gap-2.5 rounded-full pl-3.5 pr-9 text-left text-[14px] transition-[background-color,color] duration-150 ' +
                  (selected ? 'bg-mark-soft font-medium text-ink' : 'text-ink-soft hover:bg-panel hover:text-ink')
                }
              >
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM9 12h6M9 16h4" />
                </svg>
                <span className="truncate">{label}</span>
              </button>
              {canEdit && labels.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onDelete(i)}
                  aria-label={`Delete ${label}`}
                  title="Delete page (it stays in version history)"
                  className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-ink-faint opacity-0 transition-opacity duration-150 hover:bg-line/70 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100"
                >
                  <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
