'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { PlacardHeader } from '@/components/ui/PlacardHeader';
import { TrustRow } from '@/components/ui/TrustRow';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { getCurrentUser } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { ProAccessNotice } from '@/components/ui/ProAccessNotice';
import { updateMyServiceProAction } from '@/app/actions/servicePro';

export default function ProBusinessProfileSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<'signed_out' | 'not_pro' | 'pro'>('signed_out');

  const [servicesOfferedText, setServicesOfferedText] = useState('');
  const [serviceDescriptions, setServiceDescriptions] = useState('');
  const [serviceAreaZip, setServiceAreaZip] = useState('');
  const [serviceRadius, setServiceRadius] = useState<string>('');
  const [yearsExperience, setYearsExperience] = useState<string>('');
  const [bio, setBio] = useState('');

  type Certification = { name: string; url: string };
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [newCertName, setNewCertName] = useState('');
  const [newCertUrl, setNewCertUrl] = useState('');

  const [photos, setPhotos] = useState<string[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  const servicesOffered = useMemo(() => {
    const arr = servicesOfferedText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    // Deduplicate (case-insensitive) while preserving input casing for the first instance
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of arr) {
      const k = s.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(s);
      }
    }
    return out;
  }, [servicesOfferedText]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const user = await getCurrentUser();
      if (!user) {
        setAccess('signed_out');
        setUserId(null);
        setLoading(false);
        return;
      }
      if (user.role !== 'pro') {
        setAccess('not_pro');
        setUserId(null);
        setLoading(false);
        return;
      }
      setAccess('pro');
      setUserId(user.id);

      const { data, error: e } = await supabase
        .from('service_pros')
        .select(
          'bio, service_descriptions, service_area_zip, service_radius, years_experience, before_after_photos, certifications, services_offered'
        )
        .eq('user_id', user.id)
        .single();

      if (e) {
        setError(e.message || 'Failed to load business profile.');
        setLoading(false);
        return;
      }

      setBio(data?.bio || '');
      setServiceDescriptions(data?.service_descriptions || '');
      setServiceAreaZip(data?.service_area_zip || '');
      setServiceRadius(data?.service_radius != null ? String(data.service_radius) : '');
      setYearsExperience(data?.years_experience != null ? String(data.years_experience) : '');

      const offered = Array.isArray(data?.services_offered) ? (data.services_offered as string[]) : [];
      setServicesOfferedText(offered.join(', '));

      const loadedCerts = Array.isArray(data?.certifications) ? (data.certifications as Certification[]) : [];
      setCertifications(
        loadedCerts
          .filter((c) => typeof c?.name === 'string' && typeof c?.url === 'string')
          .map((c) => ({ name: c.name, url: c.url }))
      );

      const loadedPhotos = Array.isArray(data?.before_after_photos) ? (data.before_after_photos as string[]) : [];
      setPhotos(loadedPhotos.filter((p) => typeof p === 'string'));

      setLoading(false);
    };

    void load();
  }, []);

  const canEdit = !loading && Boolean(userId);

  function addCertification() {
    const name = newCertName.trim();
    const url = newCertUrl.trim();
    if (!name || !url) return;
    setCertifications((prev) => [...prev, { name, url }]);
    setNewCertName('');
    setNewCertUrl('');
  }

  function removeCertification(idx: number) {
    setCertifications((prev) => prev.filter((_, i) => i !== idx));
  }

  function addPhoto() {
    const url = newPhotoUrl.trim();
    if (!url) return;
    setPhotos((prev) => [...prev, url]);
    setNewPhotoUrl('');
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const radius = serviceRadius.trim() === '' ? null : Number(serviceRadius);
    if (radius !== null && (Number.isNaN(radius) || radius < 0)) {
      setError('Service radius must be a positive number.');
      setSaving(false);
      return;
    }

    const years = yearsExperience.trim() === '' ? null : Number(yearsExperience);
    if (years !== null && (Number.isNaN(years) || years < 0)) {
      setError('Years of experience must be a positive number.');
      setSaving(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await updateMyServiceProAction({
      bio: bio.trim() || undefined,
      service_descriptions: serviceDescriptions.trim() || '',
      service_area_zip: serviceAreaZip.trim() || '',
      service_radius: radius === null ? undefined : radius,
      years_experience: years === null ? undefined : years,
      before_after_photos: photos,
      services_offered: servicesOffered,
      certifications,
    }, session?.access_token ?? undefined);

    if (!res.success) {
      setError(res.error || 'Failed to save business profile.');
      setSaving(false);
      return;
    }

    // Read-after-write: confirm values from Supabase.
    const { data, error: e } = await supabase
      .from('service_pros')
      .select(
        'bio, service_descriptions, service_area_zip, service_radius, years_experience, before_after_photos, certifications, services_offered'
      )
      .eq('user_id', userId)
      .single();
    if (e) setError(e.message || 'Saved, but failed to reload.');
    else {
      setBio(data?.bio || '');
      setServiceDescriptions(data?.service_descriptions || '');
      setServiceAreaZip(data?.service_area_zip || '');
      setServiceRadius(data?.service_radius != null ? String(data.service_radius) : '');
      setYearsExperience(data?.years_experience != null ? String(data.years_experience) : '');
      const offered = Array.isArray(data?.services_offered) ? (data.services_offered as string[]) : [];
      setServicesOfferedText(offered.join(', '));
      const loadedCerts = Array.isArray(data?.certifications) ? (data.certifications as Certification[]) : [];
      setCertifications(
        loadedCerts
          .filter((c) => typeof c?.name === 'string' && typeof c?.url === 'string')
          .map((c) => ({ name: c.name, url: c.url }))
      );
      const loadedPhotos = Array.isArray(data?.before_after_photos) ? (data.before_after_photos as string[]) : [];
      setPhotos(loadedPhotos.filter((p) => typeof p === 'string'));
      setSuccess('Business profile saved.');
    }
    setSaving(false);
  }

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/pro/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <div className="mt-3">
            <PlacardHeader title="Business Profile" subtitle="Services, service area, credentials, photos, and bio." tone="primary" />
          </div>
          <div className="mt-3">
            <TrustRow />
          </div>
        </div>

        <Card withRail>
          <Label>PROFILE DETAILS</Label>

          {error && <div className="mt-4 p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">{error}</div>}
          {success && (
            <div className="mt-4 p-4 bg-surface2 border border-[var(--surface-border)] border-l-[3px] border-l-accent rounded-lg text-text">
              {success}
            </div>
          )}

          {loading ? (
            <p className="mt-4 text-sm text-muted/70">Loading…</p>
          ) : !userId ? (
            <ProAccessNotice nextHref="/pro/settings/business-profile" signedIn={access !== 'signed_out'} />
          ) : (
            <div className="mt-4 space-y-4">
              <Input
                label="Services offered"
                value={servicesOfferedText}
                onChange={(e) => setServicesOfferedText(e.target.value)}
                placeholder="Cleaning, Plumbing, Barber..."
              />
              <Textarea
                label="Service descriptions"
                value={serviceDescriptions}
                onChange={(e) => setServiceDescriptions(e.target.value)}
                rows={5}
                placeholder="Describe what you do in plain English..."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Service area (zip codes)"
                  value={serviceAreaZip}
                  onChange={(e) => setServiceAreaZip(e.target.value)}
                  placeholder="e.g., 78701, 78702, 78703"
                />
                <Input
                  label="Service radius"
                  type="number"
                  min="0"
                  step="1"
                  value={serviceRadius}
                  onChange={(e) => setServiceRadius(e.target.value)}
                  placeholder="e.g., 10"
                />
              </div>

              <Input
                label="Years of experience"
                type="number"
                min="0"
                step="1"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                placeholder="e.g., 5"
              />

              <Textarea
                label="Bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                placeholder="About my business..."
              />

              <div className="space-y-3">
                <div className="text-sm font-medium text-text">Certifications / licenses</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Name"
                    value={newCertName}
                    onChange={(e) => setNewCertName(e.target.value)}
                    placeholder="e.g., EPA Certified"
                  />
                  <Input
                    label="Document URL"
                    value={newCertUrl}
                    onChange={(e) => setNewCertUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="secondary" onClick={addCertification} disabled={!canEdit}>
                    Add certification →
                  </Button>
                </div>

                {certifications.length > 0 && (
                  <div className="space-y-2">
                    {certifications.map((c, idx) => (
                      <div
                        key={`${c.name}-${idx}`}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-surface"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-text truncate">{c.name}</div>
                          <a
                            className="text-sm text-text underline underline-offset-4 decoration-border hover:decoration-text truncate block"
                            href={c.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {c.url}
                          </a>
                        </div>
                        <button
                          type="button"
                          className="text-sm text-muted hover:text-text"
                          onClick={() => removeCertification(idx)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-text">Before &amp; after photos</div>
                <Input
                  label="Photo URL"
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  placeholder="https://..."
                />
                <div className="flex justify-end">
                  <Button type="button" variant="secondary" onClick={addPhoto} disabled={!canEdit}>
                    Add photo →
                  </Button>
                </div>

                {photos.length > 0 && (
                  <div className="space-y-2">
                    {photos.map((p, idx) => (
                      <div
                        key={`${p}-${idx}`}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-surface"
                      >
                        <a
                          className="text-sm text-text underline underline-offset-4 decoration-border hover:decoration-text truncate"
                          href={p}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {p}
                        </a>
                        <button
                          type="button"
                          className="text-sm text-muted hover:text-text"
                          onClick={() => removePhoto(idx)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/pro/settings/business" className="block">
            <Card withRail>
              <Label>EDIT BUSINESS</Label>
              <p className="mt-3 text-sm text-muted">Profile, services, schedule, reviews.</p>
            </Card>
          </Link>
          <Link href="/pro/credentials" className="block">
            <Card withRail>
              <Label>CREDENTIALS</Label>
              <p className="mt-3 text-sm text-muted">Upload + manage verification documents.</p>
            </Card>
          </Link>
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={() => void save()} disabled={!userId || saving || loading} showArrow={false}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

