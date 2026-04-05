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
import {
  getProfilePhotoUrl,
  getBusinessLogoUrl,
  getStoragePublicUrl,
  uploadProfilePhoto,
  uploadBusinessLogo,
  removeProfilePhoto,
  removeBusinessLogo,
  listProCertifications,
  addProCertification,
  deleteProCertification,
  type ProCertification,
} from '@/lib/proProfile';

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

  const [certifications, setCertifications] = useState<ProCertification[]>([]);
  const [newCertTitle, setNewCertTitle] = useState('');
  const [newCertIssuer, setNewCertIssuer] = useState('');
  const [newCertFile, setNewCertFile] = useState<File | null>(null);
  const certFileInputRef = useRef<HTMLInputElement | null>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);

  const [subcategories, setSubcategories] = useState<{ id: string; name: string }[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);

  const [servicesSelected, setServicesSelected] = useState<Set<string>>(new Set());
  const [customService, setCustomService] = useState('');
  const servicesOffered = useMemo(() => Array.from(servicesSelected.values()).sort((a, b) => a.localeCompare(b)), [servicesSelected]);

  const serviceOptions = useMemo((): string[] => {
    return subcategories.map((s) => s.name);
  }, [subcategories]);

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

  async function uploadWorkPhoto(userId: string, file: File): Promise<string> {
    const ext = safeExtFromFile(file);
    const safeName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    const path = `${userId}/work/${safeName}`;
    const { data, error: uploadErr } = await supabase.storage.from('profile-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
    if (uploadErr || !data?.path) {
      throw new Error(uploadErr?.message || 'Upload failed.');
    }
    const pub = supabase.storage.from('profile-images').getPublicUrl(data.path);
    return pub.data.publicUrl;
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

      const [avatar, logo, certs] = await Promise.all([
        getProfilePhotoUrl(user.id),
        getBusinessLogoUrl(user.id),
        listProCertifications(user.id),
      ]);
      setAvatarUrl(avatar ?? '');
      setLogoUrl(logo ?? '');
      setCertifications(certs);

      const { data, error: e } = await supabase
        .from('service_pros')
        .select(
          'bio, service_descriptions, service_area_zip, service_radius, years_experience, before_after_photos, services_offered, category_id'
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
      setServicesSelected(new Set(offered.filter((s) => typeof s === 'string' && s.trim() !== '')));

      const catId = (data as { category_id?: string })?.category_id;
      if (typeof catId === 'string' && catId.trim() !== '') {
        const { data: cat } = await supabase.from('service_categories').select('slug').eq('id', catId).maybeSingle();
        setCategorySlug(typeof (cat as { slug?: string })?.slug === 'string' ? String((cat as { slug?: string }).slug) : null);
      } else {
        setCategorySlug(null);
      }

      const loadedPhotos = Array.isArray(data?.before_after_photos) ? (data.before_after_photos as string[]) : [];
      setPhotos(loadedPhotos.filter((p) => typeof p === 'string'));

      setLoading(false);
    };

    void load();
  }, []);

  useEffect(() => {
    if (!categorySlug?.trim()) {
      setSubcategories([]);
      setSubcategoriesLoading(false);
      return;
    }
    let mounted = true;
    setSubcategoriesLoading(true);
    fetch(`/api/marketplace/subcategories?serviceSlug=${encodeURIComponent(categorySlug.trim())}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        const subs = Array.isArray(data?.subcategories) ? data.subcategories : [];
        setSubcategories(subs.map((s: { id?: string; name?: string }) => ({ id: String(s?.id ?? ''), name: String(s?.name ?? '') })).filter((sub: { id: string; name: string }) => sub.name));
      })
      .catch(() => {
        if (mounted) setSubcategories([]);
      })
      .finally(() => {
        if (mounted) setSubcategoriesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [categorySlug]);

  const canEdit = !loading && Boolean(userId);

  async function addCertification() {
    const title = newCertTitle.trim();
    if (!title) return;
    if (!userId) return;
    setError(null);
    try {
      const res = await addProCertification(userId, {
        title,
        issuer: newCertIssuer.trim() || undefined,
        file: newCertFile ?? undefined,
      });
      if (res.success && res.cert) {
        setCertifications((prev) => [res.cert!, ...prev]);
        setNewCertTitle('');
        setNewCertIssuer('');
        setNewCertFile(null);
        if (certFileInputRef.current) certFileInputRef.current.value = '';
        setSuccess('Certification added.');
      } else {
        setError(res.error || 'Failed to add certification.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add certification.');
    }
  }

  async function removeCertification(certId: string) {
    if (!userId) return;
    setError(null);
    try {
      const res = await deleteProCertification(userId, certId);
      if (res.success) {
        setCertifications((prev) => prev.filter((c) => c.id !== certId));
        setSuccess('Certification removed.');
      } else {
        setError(res.error || 'Failed to remove certification.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove certification.');
    }
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
        'bio, service_descriptions, service_area_zip, service_radius, years_experience, before_after_photos, services_offered, category_id'
      )
      .eq('user_id', userId)
      .single();
    if (e) setError(e.message || 'Saved, but failed to reload.');
    else if (data) {
      setBio(data.bio || '');
      setServiceDescriptions(data.service_descriptions || '');
      setServiceAreaZip(data.service_area_zip || '');
      setServiceRadius(data.service_radius != null ? String(data.service_radius) : '');
      setYearsExperience(data.years_experience != null ? String(data.years_experience) : '');
      const offered = Array.isArray(data.services_offered) ? (data.services_offered as string[]) : [];
      setServicesSelected(new Set(offered.filter((s) => typeof s === 'string' && s.trim() !== '')));
      const loadedPhotos = Array.isArray(data.before_after_photos) ? (data.before_after_photos as string[]) : [];
      setPhotos(loadedPhotos.filter((p) => typeof p === 'string'));
      const [logo, avatar] = await Promise.all([
        getBusinessLogoUrl(userId),
        getProfilePhotoUrl(userId),
      ]);
      setLogoUrl(logo ?? '');
      setAvatarUrl(avatar ?? '');
      const certs = await listProCertifications(userId);
      setCertifications(certs);
      setSuccess('Business profile saved.');
    }
    setSaving(false);
  }

  return (
    <AppLayout mode="pro">
      <div className="mx-auto max-w-4xl min-w-0 space-y-6 px-3 py-6 sm:px-4">
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
                              const res = await uploadProfilePhoto(userId, f);
                              if (res.success && res.url) {
                                setAvatarUrl(res.url);
                                setSuccess('Profile photo uploaded and saved.');
                              } else {
                                setError(res.error || 'Failed to upload profile photo.');
                              }
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
                            onClick={async () => {
                              if (!userId) return;
                              setError(null);
                              setUploadingAvatar(true);
                              try {
                                const res = await removeProfilePhoto(userId);
                                if (res.success) {
                                  setAvatarUrl('');
                                  setSuccess('Profile photo removed.');
                                } else setError(res.error || 'Failed to remove.');
                              } finally {
                                setUploadingAvatar(false);
                              }
                            }}
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
                              const res = await uploadBusinessLogo(userId, f);
                              if (res.success && res.url) {
                                setLogoUrl(res.url);
                                setSuccess('Logo uploaded and saved.');
                              } else {
                                setError(res.error || 'Failed to upload logo.');
                              }
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
                            onClick={async () => {
                              if (!userId) return;
                              setError(null);
                              setUploadingLogo(true);
                              try {
                                const res = await removeBusinessLogo(userId);
                                if (res.success) {
                                  setLogoUrl('');
                                  setSuccess('Logo removed.');
                                } else setError(res.error || 'Failed to remove.');
                              } finally {
                                setUploadingLogo(false);
                              }
                            }}
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
                  Profile photo and logo use avatars/logos buckets. Work photos use profile-images. Apply migration `037_pro_profiles_and_certifications.sql` if uploads fail.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-text">Services offered</div>
                <div className="text-xs text-muted">
                  Choose from subcategories in your category{categorySlug ? ` (${categorySlug})` : ''}. You can also add a custom service.
                </div>
                {subcategoriesLoading ? (
                  <p className="text-sm text-muted/70">Loading subcategories…</p>
                ) : serviceOptions.length === 0 && !categorySlug ? (
                  <p className="text-sm text-muted/70">Save your primary service category in the Public profile tab first, then subcategories will appear here.</p>
                ) : null}
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
                    label="Title"
                    value={newCertTitle}
                    onChange={(e) => setNewCertTitle(e.target.value)}
                    placeholder="e.g., EPA Certified"
                  />
                  <Input
                    label="Issuer"
                    value={newCertIssuer}
                    onChange={(e) => setNewCertIssuer(e.target.value)}
                    placeholder="e.g., EPA"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={certFileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => setNewCertFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => certFileInputRef.current?.click()}
                    showArrow={false}
                    className="text-sm"
                  >
                    {newCertFile ? newCertFile.name : 'Attach file'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void addCertification()} disabled={!canEdit || !newCertTitle.trim()}>
                    Add certification →
                  </Button>
                </div>

                {certifications.length > 0 && (
                  <div className="space-y-2">
                    {certifications.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-surface"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-text truncate">{c.title}</div>
                          {c.issuer && (
                            <div className="text-xs text-muted">Issuer: {c.issuer}</div>
                          )}
                          {c.file_path && (
                            <a
                              className="text-sm text-accent hover:underline truncate block mt-0.5"
                              href={getStoragePublicUrl('certifications', c.file_path)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View document
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          className="text-sm text-muted hover:text-text"
                          onClick={() => void removeCertification(c.id)}
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
                        const url = await uploadWorkPhoto(userId, f);
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

