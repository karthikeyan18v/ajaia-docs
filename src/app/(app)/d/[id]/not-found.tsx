import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';

// Shown for missing documents and for documents you can't access: the two are
// deliberately indistinguishable.
export default function DocNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col items-start gap-3 px-4 pt-20">
      <h1 className="text-[22px] font-semibold">This document isn’t available</h1>
      <p className="text-ink-soft">
        It may have been deleted, or the owner hasn’t shared it with this account. If you expected access, ask the owner to
        share it with your email.
      </p>
      <Link href="/" className={buttonClass('secondary', 'md', 'mt-3')}>
        Back to documents
      </Link>
    </main>
  );
}
