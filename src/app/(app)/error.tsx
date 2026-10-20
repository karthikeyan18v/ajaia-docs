'use client';

import { Button } from '@/components/ui/Button';

// Last-resort boundary for unexpected server or render errors in the app.
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col items-start gap-3 px-4 pt-20">
      <h1 className="text-[22px] font-semibold">Something went wrong</h1>
      <p className="text-ink-soft">
        We couldn’t load this page. Your saved work is safe. Try again, and if it keeps happening, reload the page.
      </p>
      <Button variant="secondary" className="mt-3" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
