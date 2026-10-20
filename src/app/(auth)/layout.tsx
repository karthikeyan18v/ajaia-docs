import { Wordmark } from '@/components/Wordmark';
import { Avatar } from '@/components/ui/Avatar';

// Split layout: the sign-in form, and beside it a preview of what the product
// does (a shared doc with its people and permissions) instead of a blank margin.
export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-5 pb-12 pt-6 sm:px-10">
        <Wordmark href="/login" />
        <main className="flex flex-1 items-start justify-center pt-10 sm:items-center sm:pt-0">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
      </div>
      <aside aria-hidden className="relative hidden overflow-hidden bg-panel lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_80%_0%,var(--color-mark-soft),transparent_60%)]" />
        <div className="relative flex h-full flex-col justify-center px-14 py-16">
          <p className="max-w-[26ch] text-[30px] font-semibold leading-[1.15] tracking-tight text-ink">
            Write it once. Share it with the right people.
          </p>
          <p className="mt-3 max-w-[44ch] text-ink-soft">
            Owners decide who can view and who can edit. Every version is kept, so the original is never lost.
          </p>
          <DocPreview />
        </div>
      </aside>
    </div>
  );
}

function DocPreview() {
  return (
    <div className="relative mt-12 max-w-[520px]">
      <div className="paper rounded-[var(--radius-panel)] px-9 pb-10 pt-8 -rotate-[0.6deg]">
        <div className="flex items-center justify-between">
          <span className="flex -space-x-2">
            <span className="rounded-full ring-2 ring-paper"><Avatar name="Alice" idKey="alice@ajaia.dev" size={28} /></span>
            <span className="rounded-full ring-2 ring-paper"><Avatar name="Bob" idKey="bob@ajaia.dev" size={28} /></span>
            <span className="rounded-full ring-2 ring-paper"><Avatar name="Carol" idKey="carol@ajaia.dev" size={28} /></span>
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-ink-faint">
            <span className="size-1.5 rounded-full bg-ok" /> Saved just now
          </span>
        </div>
        <p className="mt-6 font-serif text-[24px] font-semibold leading-tight">Q4 launch plan</p>
        <p className="mt-3 font-serif text-[15px] leading-relaxed text-ink-soft">
          We ship sharing with <span className="shadow-[inset_0_-0.45em_0_var(--color-mark)] text-ink">view and edit roles</span>,
          and keep <strong className="text-ink">every original version</strong> recoverable.
        </p>
        <ul className="mt-3 list-disc pl-5 font-serif text-[15px] leading-relaxed text-ink-soft marker:text-ink-faint">
          <li>Import from .docx and Markdown</li>
          <li><em>Conflict-safe</em> autosave</li>
        </ul>
      </div>
      <div className="paper absolute -bottom-6 -right-4 flex items-center gap-3 rounded-[var(--radius-panel)] px-4 py-3 shadow-[var(--shadow-float)] rotate-[1deg]">
        <Avatar name="Carol" idKey="carol@ajaia.dev" size={30} />
        <span className="text-[13px] leading-tight">
          <span className="block font-medium text-ink">Carol asked to edit</span>
          <span className="text-ink-faint">Allow editing · Deny</span>
        </span>
      </div>
    </div>
  );
}
