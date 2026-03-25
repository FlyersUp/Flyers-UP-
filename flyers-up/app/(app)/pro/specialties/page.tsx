'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { SpecialtyTagInput } from '@/components/onboarding/SpecialtyTagInput';
import { getCurrentUser, getProOccupationSlug, getProSpecialties } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { setProSpecialtiesAction } from '@/app/actions/proSpecialties';

export default function ProSpecialtiesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [occupationSlug, setOccupationSlug] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await getCurrentUser();
      if (!user || user.role !== 'pro') {
        setError('Unauthorized. Pro access required.');
        setLoading(false);
        return;
      }
      const [occSlug, specs] = await Promise.all([
        getProOccupationSlug(user.id),
        getProSpecialties(user.id),
      ]);
      setOccupationSlug(occSlug ?? '');
      setLabels(specs.map((s) => s.label));
    } catch (err) {
      console.error('Error loading specialties:', err);
      setError('Failed to load specialties.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const { data: { session } } = await supabase.auth.getSession();
      const result = await setProSpecialtiesAction(labels, session?.access_token ?? undefined);
      if (!result.success) {
        setError(result.error || 'Failed to save specialties.');
        return;
      }
      setSuccess('Specialties saved successfully.');
    } catch (err) {
      console.error('Error saving specialties:', err);
      setError('Failed to save specialties.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout mode="pro">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-muted">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="pro">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Link href="/pro/profile" className="text-sm text-muted hover:text-text">
            ← Back to Profile
          </Link>
          <h1 className="text-2xl font-semibold text-text mt-3 mb-2">Specialties</h1>
          <Label>MANAGE SPECIALTIES</Label>
          <p className="text-sm text-muted mt-2 max-w-xl">
            Add up to 8 specialties that highlight what you’re especially good at. These help customers understand your strengths and find you more easily. Specialties are not your service list — manage those under Manage services.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg text-text text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-surface2 border border-accent/30 rounded-lg text-text text-sm">
            {success}
          </div>
        )}

        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-[var(--surface-solid)] dark:bg-[#1f232a] shadow-sm p-6">
          <SpecialtyTagInput
            value={labels}
            onChange={setLabels}
            occupationSlug={occupationSlug}
            label="Your specialties"
            helperText="Pick suggestions below or type your own. Duplicates are ignored. These should describe strengths within your occupation, not duplicate your official services."
          />
          <div className="mt-6">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Specialties'}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
