'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { updateMyProfileAction } from '@/app/actions/profile';

export default function ProBusinessProfileSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<'signed_out' | 'not_pro' | 'pro'>('signed_out');

  const [serviceDescriptions, setServiceDescriptions] = useState('');
  const [serviceAreaZip, setServiceAreaZip] = useState('');
  const [serviceRadius, setServiceRadius] = useState<string>('');
  const [yearsExperience, setYearsExperience] = useState<string>('');
  const [bio, setBio] = useState('');

  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const workPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingWorkPhotos, setUploadingWorkPhotos] = useState(false);

  type Certification = { name: string; url: string };
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [newCertName, setNewCertName] = useState('');
  const [newCertUrl, setNewCertUrl] = useState('');

  const [photos, setPhotos] = useState<string[]>([]);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);

  const [servicesSelected, setServicesSelected] = useState<Set<string>>(new Set());
  const [customService, setCustomService] = useState('');
  const servicesOffered = useMemo(() => Array.from(servicesSelected.values()).sort((a, b) => a.localeCompare(b)), [servicesSelected]);

  const serviceOptions = useMemo((): string[] => {
    const base: Record<string, string[]> = {
      cleaning: ['Standard clean', 'Deep clean', 'Move-out clean', 'Carpet cleaning', 'Window cleaning', 'Laundry', 'Organizing'],
      plumbing: ['Leak repair', 'Drain clog', 'Toilet repair', 'Faucet install', 'Water heater', 'Pipe replacement'],
      handyman: ['Furniture assembly', 'TV mounting', 'Drywall patch', 'Door repair', 'Shelf install', 'Minor repairs'],
      electrical: ['Outlet install', 'Light fixture', 'Ceiling fan', 'Breaker issue', 'Switch replacement'],
      'lawn-care': ['Mowing', 'Edging', 'Weeding', 'Leaf cleanup', 'Hedge trimming', 'Mulch'],
      painting: ['Interior paint', 'Exterior paint', 'Touch-ups', 'Cabinets'],
      moving: ['Small move', 'Packing help', 'Furniture delivery', 'Haul away'],
      barber: ['Haircut', 'Beard trim', 'Line-up'],
      hvac: ['Maintenance', 'Repair', 'Filter replacement'],
      roofing: ['Inspection', 'Repair', 'Gutter cleaning'],
      landscaping: ['Planting', 'Design consult', 'Hardscape'],
      'pest-control': ['Inspection', 'Treatment', 'Prevention plan'],
      'carpet-cleaning': ['Room cleaning', 'Stain removal', 'Deodorize'],
    };
    const key = (categorySlug ?? '').trim().toLowerCase();
    const opts = base[key];
    if (opts && opts.length) return opts;
    return ['Consultation', 'Standard service', 'Deep service', 'Repair', 'Install', 'Maintenance'];
  }, [categorySlug]);

  function addCustomService() {
    const v = customService.trim();
    if (!v) return;
    setServicesSelected((prev) => new Set([...prev, v]));
    setCustomService('');
  }

  function toggleService(name: string) {
    setServicesSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function safeExtFromFile(file: File): string {
    const n = (file.name || '').toLowerCase();
    const m = n.match(/\.([a-z0-9]+)$/i);
    const ext = m?.[1] ?? '';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
    if (file.type === 'image/png') return 'png';
    if (file.type === 'image/webp') return 'webp';
    if (file.type === 'image/gif') return 'gif';
    if (file.type === 'image/jpeg') return 'jpg';
    return 'png';
  }

  async function uploadImageToProfileBucket(args: { userId: string; file: File; folder: 'avatar' | 'logo' | 'work' }) {
    const ext = safeExtFromFile(args.file);
    const safeName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    const path = `${args.userId}/${args.folder}/${safeName}`;
    const { data, error: uploadErr } = await supabase.storage.from('profile-images').upload(path, args.file, {
      cacheControl: '3600',
      upsert: false,
      contentType: args.file.type || undefined,
    });
    if (uploadErr || !data?.path) {
      throw new Error(uploadErr?.message || 'Upload failed. Ensure the `profile-images` bucket exists and policies are applied.');
    }
    const pub = supabase.storage.from('profile-images').getPublicUrl(data.path);
    const url = pub.data.publicUrl;
    if (!url) throw new Error('Upload succeeded but could not resolve a public URL.');
    return url;
  }

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

      const { data: prof } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
      setAvatarUrl(typeof (prof as any)?.avatar_url === 'string' ? String((prof as any).avatar_url) : '');

      const { data, error: e } = await supabase
        .from('service_pros')
        .select(
          'bio, service_descriptions, service_area_zip, service_radius, years_experience, before_after_photos, certifications, services_offered, category_id, logo_url'
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
      setLogoUrl(typeof (data as any)?.logo_url === 'string' ? String((data as any).logo_url) : '');

      const offered = Array.isArray(data?.services_offered) ? (data.services_offered as string[]) : [];
      setServicesSelected(new Set(offered.filter((s) => typeof s === 'string' && s.trim() !== '')));

      const catId = (data as any)?.category_id;
      if (typeof catId === 'string' && catId.trim() !== '') {
        const { data: cat } = await supabase.from('service_categories').select('slug').eq('id', catId).maybeSingle();
        setCategorySlug(typeof (cat as any)?.slug === 'string' ? String((cat as any).slug) : null);
      } else {
        setCategorySlug(null);
      }

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

    const proRes = await updateMyServiceProAction({
      bio: bio.trim() || undefined,
      service_descriptions: serviceDescriptions.trim() || '',
      service_area_zip: serviceAreaZip.trim() || '',
      service_radius: radius === null ? undefined : radius,
      years_experience: years === null ? undefined : years,
      before_after_photos: photos,
      services_offered: servicesOffered,
      certifications,
      logo_url: logoUrl.trim() ? logoUrl.trim() : null,
    }, session?.access_token ?? undefined);

    if (!proRes.success) {
      setError(proRes.error || 'Failed to save business profile.');
      setSaving(false);
      return;
    }

    const profRes = await updateMyProfileAction(
      { avatar_url: avatarUrl.trim() ? avatarUrl.trim() : null },
      session?.access_token ?? undefined
    );
    if (!profRes.success) {
      setError(profRes.error || 'Saved business info, but failed to save profile photo.');
      setSaving(false);
      return;
    }

    // Read-after-write: confirm values from Supabase.
    const { data, error: e } = await supabase
      .from('service_pros')
      .select(
        'bio, service_descriptions, service_area_zip, service_radius, years_experience, before_after_photos, certifications, services_offered, logo_url, category_id'
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
      setServicesSelected(new Set(offered.filter((s) => typeof s === 'string' && s.trim() !== '')));
      const loadedCerts = Array.isArray(data?.certifications) ? (data.certifications as Certification[]) : [];
      setCertifications(
        loadedCerts
          .filter((c) => typeof c?.name === 'string' && typeof c?.url === 'string')
          .map((c) => ({ name: c.name, url: c.url }))
      );
      const loadedPhotos = Array.isArray(data?.before_after_photos) ? (data.before_after_photos as string[]) : [];
      setPhotos(loadedPhotos.filter((p) => typeof p === 'string'));
      setLogoUrl(typeof (data as any)?.logo_url === 'string' ? String((data as any).logo_url) : '');
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
              <div className="space-y-3">
                <div className="text-sm font-medium text-text">Profile photo / logo</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="text-xs uppercase tracking-wide text-muted">Profile photo</div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-14 w-14 rounded-full overflow-hidden border border-border bg-surface2 flex items-center justify-center">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt="Profile photo" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xl text-muted/70">👤</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0] ?? null;
                            if (!f || !userId) return;
                            setError(null);
                            setUploadingAvatar(true);
                            try {
                              const url = await uploadImageToProfileBucket({ userId, file: f, folder: 'avatar' });
                              setAvatarUrl(url);
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Failed to upload profile photo.');
                            } finally {
                              setUploadingAvatar(false);
                              e.target.value = '';
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={!canEdit || uploadingAvatar}
                          onClick={() => avatarInputRef.current?.click()}
                          showArrow={false}
                          className="px-3 py-2 rounded-lg text-sm"
                        >
                          {uploadingAvatar ? 'Uploading…' : 'Upload photo'}
                        </Button>
                        {avatarUrl ? (
                          <button
                            type="button"
                            className="ml-3 text-sm text-muted hover:text-text"
                            onClick={() => setAvatarUrl('')}
                            disabled={!canEdit || uploadingAvatar}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="text-xs uppercase tracking-wide text-muted">Business logo</div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-14 w-14 rounded-xl overflow-hidden border border-border bg-surface2 flex items-center justify-center">
                        {logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoUrl} alt="Business logo" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xl text-muted/70">🏷️</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0] ?? null;
                            if (!f || !userId) return;
                            setError(null);
                            setUploadingLogo(true);
                            try {
                              const url = await uploadImageToProfileBucket({ userId, file: f, folder: 'logo' });
                              setLogoUrl(url);
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Failed to upload logo.');
                            } finally {
                              setUploadingLogo(false);
                              e.target.value = '';
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={!canEdit || uploadingLogo}
                          onClick={() => logoInputRef.current?.click()}
                          showArrow={false}
                          className="px-3 py-2 rounded-lg text-sm"
                        >
                          {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                        </Button>
                        {logoUrl ? (
                          <button
                            type="button"
                            className="ml-3 text-sm text-muted hover:text-text"
                            onClick={() => setLogoUrl('')}
                            disabled={!canEdit || uploadingLogo}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted/70">
                  Uploads are stored in Supabase Storage (`profile-images`). If uploads fail in production, apply migration `016_add_profile_image_storage.sql`.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-text">Services offered</div>
                <div className="text-xs text-muted">
                  Choose from a list based on your category{categorySlug ? ` (${categorySlug})` : ''}. You can also add a custom service.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {serviceOptions.map((name) => {
                    const on = servicesSelected.has(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleService(name)}
                        disabled={!canEdit}
                        className={[
                          'flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left',
                          on ? 'border-accent bg-surface2' : 'border-border bg-surface hover:bg-surface2',
                        ].join(' ')}
                      >
                        <span className="text-sm font-medium text-text">{name}</span>
                        <span className={['text-sm', on ? 'text-accent' : 'text-muted'].join(' ')}>{on ? 'Selected' : 'Add'}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="Add custom service"
                      value={customService}
                      onChange={(e) => setCustomService(e.target.value)}
                      placeholder="e.g., Oven cleaning"
                    />
                  </div>
                  <Button type="button" variant="secondary" disabled={!canEdit || customService.trim() === ''} onClick={addCustomService}>
                    Add →
                  </Button>
                </div>
                {servicesOffered.length ? (
                  <div className="text-xs text-muted">
                    Selected: {servicesOffered.join(', ')}
                  </div>
                ) : null}
              </div>

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
                <input
                  ref={workPhotoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (!files.length || !userId) return;
                    setError(null);
                    setUploadingWorkPhotos(true);
                    try {
                      const urls: string[] = [];
                      for (const f of files) {
                        const url = await uploadImageToProfileBucket({ userId, file: f, folder: 'work' });
                        urls.push(url);
                      }
                      setPhotos((prev) => [...prev, ...urls]);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to upload one or more photos.');
                    } finally {
                      setUploadingWorkPhotos(false);
                      e.target.value = '';
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted">Upload images from your phone/computer.</div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!canEdit || uploadingWorkPhotos}
                    onClick={() => workPhotoInputRef.current?.click()}
                    showArrow={false}
                  >
                    {uploadingWorkPhotos ? 'Uploading…' : 'Upload photos'}
                  </Button>
                </div>

                {photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((p, idx) => (
                      <div key={`${p}-${idx}`} className="rounded-xl border border-border bg-surface overflow-hidden">
                        <a href={p} target="_blank" rel="noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p} alt={`Work photo ${idx + 1}`} className="h-32 w-full object-cover" />
                        </a>
                        <div className="p-2 flex items-center justify-between gap-2">
                          <a className="text-xs text-muted hover:text-text truncate" href={p} target="_blank" rel="noreferrer">
                            View
                          </a>
                          <button
                            type="button"
                            className="text-xs text-muted hover:text-text"
                            onClick={() => removePhoto(idx)}
                            disabled={!canEdit}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!photos.length ? <div className="text-sm text-muted">No photos yet.</div> : null}
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

