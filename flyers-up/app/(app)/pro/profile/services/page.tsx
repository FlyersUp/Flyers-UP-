'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import { OccupationServicesChecklist } from '@/components/onboarding/OccupationServicesChecklist';
import {
  getMyProServicesEditorDataAction,
  updateProServicesSelectionsAction,
} from '@/app/actions/proOnboarding';
import type { OccupationServiceRow } from '@/lib/occupationData';

const ONBOARDING_FALLBACK = '/onboarding/pro?next=%2Fpro%2Fprofile';

export default function ProProfileServicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [occupation, setOccupation] = useState<{
    name: string;
    icon: string | null;
  } | null>(null);
  const [services, setServices] = useState<OccupationServiceRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [staleRemoved, setStaleRemoved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStaleRemoved(false);
    try {
      const data = await getMyProServicesEditorDataAction();
      if (!data.ok) {
        if (data.reason === 'not_authenticated') {
          router.replace(`/signin?role=pro&next=${encodeURIComponent('/pro/profile/services')}`);
          return;
        }
        if (data.reason === 'not_pro') {
          router.replace(`/onboarding/role?next=${encodeURIComponent('/pro/profile')}`);
          return;
        }
        router.replace(ONBOARDING_FALLBACK);
        return;
      }

      const available = new Set(data.services.map((s) => s.id));
      const filtered = data.selectedServiceIds.filter((id) => available.has(id));
      if (filtered.length < data.selectedServiceIds.length) {
        setStaleRemoved(true);
      }

      setOccupation({ name: data.occupation.name, icon: data.occupation.icon });
      setServices(data.services);
      setSelectedIds(filtered);
    } catch (e) {
      console.error(e);
      setError('Could not load your services. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await updateProServicesSelectionsAction(selectedIds);
      if (!res.success) {
        setError(res.error || 'Could not save.');
        setSaving(false);
        return;
      }
      router.push('/pro/profile');
    } catch (e) {
      console.error(e);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const canSave = selectedIds.length > 0 && !loading;

  return (
    <PageLayout showBackButton backButtonHref="/pro/profile" backButtonText="← Profile">
      <div className="max-w-lg mx-auto space-y-6 pb-10">
        {error ? (
          <div className="rounded-xl border border-red-100 bg-danger/10 px-4 py-3 text-sm text-text">{error}</div>
        ) : null}

        {staleRemoved ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            Some services you had selected are no longer available and were removed from your list. Choose your services
            again, then save.
          </div>
        ) : null}

        <div className="rounded-2xl border border-border bg-surface shadow-sm p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-text">Manage services</h1>
          <p className="text-muted mt-2 text-sm">
            Your occupation stays the same. Only the services you offer within it are edited here.
          </p>

          {occupation ? (
            <div className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-surface2/50 border border-border">
              {occupation.icon ? <span className="text-2xl">{occupation.icon}</span> : null}
              <span className="font-medium text-text">{occupation.name}</span>
            </div>
          ) : null}

          <div className="mt-6">
            <OccupationServicesChecklist
              services={services}
              selectedIds={selectedIds}
              onChangeSelectedIds={setSelectedIds}
              loading={loading}
            />
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-6 border-t border-border">
            <Link
              href="/pro/profile"
              className="rounded-xl border border-border px-4 py-3 text-center text-base font-medium text-text hover:bg-surface2 sm:px-5"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave || saving}
              className="rounded-xl bg-accent px-4 py-3 text-base font-medium text-accentContrast hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed sm:min-w-[140px]"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
