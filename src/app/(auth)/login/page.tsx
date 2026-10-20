import type { Metadata } from 'next';
import { LoginPanel } from '@/components/auth/LoginPanel';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams;
  return <LoginPanel next={typeof next === 'string' ? next : undefined} />;
}
