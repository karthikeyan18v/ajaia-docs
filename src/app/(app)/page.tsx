import { getCurrentUser } from '@/server/auth/session';

// Placeholder until Phase 2 builds the dashboard.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6">
      <h1 className="text-[22px] font-semibold">Signed in as {user?.name}</h1>
    </main>
  );
}
