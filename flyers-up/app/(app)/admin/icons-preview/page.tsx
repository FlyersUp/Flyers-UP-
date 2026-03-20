import Layout from '@/components/Layout';
import { requireAdminUser, isAdminUser } from '@/app/(app)/admin/_admin';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppIconPreview } from '@/components/icons/AppIconPreview';

export const dynamic = 'force-dynamic';

export default async function AdminIconsPreviewPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    await requireAdminUser('/admin/icons-preview');
  }

  const isAdmin = await isAdminUser(supabase, user);
  if (!isAdmin) {
    return (
      <Layout title="Flyers Up – Admin">
        <div className="max-w-2xl mx-auto py-12 px-4">
          <h1 className="text-2xl font-semibold text-text text-center">Access denied</h1>
          <p className="mt-2 text-sm text-muted text-center">This page requires an admin account.</p>
          <div className="mt-6 text-center">
            <Link href="/admin" className="text-sm font-medium text-accent hover:underline">
              ← Back to Admin
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Flyers Up – Icon Preview">
      <div className="mx-auto max-w-4xl space-y-6 pb-24">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface2 px-3 py-2 text-sm font-medium text-text hover:bg-surface transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Admin
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-text">PWA App Icon Preview</h1>
          <p className="mt-1 text-sm text-muted">
            Maskable and standard icons for Flyers Up. Regenerate with:{' '}
            <code className="rounded bg-surface px-1.5 py-0.5 text-xs">npm run generate-icons</code>
          </p>
        </div>
        <AppIconPreview />
      </div>
    </Layout>
  );
}
