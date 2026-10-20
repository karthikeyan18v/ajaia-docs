import { Wordmark } from '@/components/Wordmark';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-5 pt-6 sm:px-8">
        <Wordmark href="/login" />
      </header>
      <main className="flex flex-1 justify-center px-4 pb-16 pt-10 sm:items-center sm:pt-6">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
