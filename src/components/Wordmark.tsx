import Link from 'next/link';

// "Docs" sits on a highlighter stroke: the one accent, used as a mark.
export function Wordmark({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-baseline gap-1 text-[17px] font-semibold tracking-tight text-ink">
      Ajaia
      <span className="px-0.5 shadow-[inset_0_-0.4em_0_var(--color-mark)]">Docs</span>
    </Link>
  );
}
