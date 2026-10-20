import { redirect } from 'next/navigation';
import { UserMenu } from '@/components/app/UserMenu';
import { Wordmark } from '@/components/Wordmark';
import { getCurrentUser } from '@/server/auth/session';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur-[2px]">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-4 px-4 sm:px-6">
          <Wordmark />
          <UserMenu user={user} />
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
