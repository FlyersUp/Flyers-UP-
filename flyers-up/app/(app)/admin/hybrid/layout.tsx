import { requireAdminUser } from '@/app/(app)/admin/_admin';

export const dynamic = 'force-dynamic';

export default async function AdminHybridLayout({ children }: { children: React.ReactNode }) {
  await requireAdminUser('/admin/hybrid');
  return <>{children}</>;
}
