/**
 * Pro Profile persistence: rates, profile photo, business logo, certifications.
 * Uses pro_profiles and pro_certifications tables + avatars/logos/certifications storage buckets.
 */

import { supabase } from '@/lib/supabaseClient';

export type PricingModel = 'flat' | 'hourly' | 'hybrid';

export interface ProProfile {
  user_id: string;
  hourly_rate: number | null;
  starting_rate: number | null;
  rate_unit: string | null;
  profile_photo_path: string | null;
  business_logo_path: string | null;
  updated_at: string;
  // Extended pricing & availability (migration 038)
  pricing_model?: PricingModel | null;
  starting_price?: number | null;
  min_job_price?: number | null;
  what_included?: string | null;
  min_hours?: number | null;
  overtime_rate?: number | null;
  travel_fee_enabled?: boolean | null;
  travel_fee_base?: number | null;
  travel_free_within_miles?: number | null;
  service_radius_miles?: number | null;
  travel_extra_per_mile?: number | null;
  same_day_bookings?: boolean | null;
  emergency_available?: boolean | null;
}

export interface ProCertification {
  id: string;
  user_id: string;
  title: string;
  issuer: string | null;
  issue_date: string | null;
  expires_at: string | null;
  file_path: string | null;
  created_at: string;
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

/** Resolve storage path to public URL */
export function getStoragePublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Get pro_profiles row for user */
export async function getProProfile(userId: string): Promise<ProProfile | null> {
  const { data, error } = await supabase
    .from('pro_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[proProfile] getProProfile error:', error.status, error.message);
    return null;
  }
  return data as ProProfile | null;
}

type ProProfileUpdateKeys =
  | 'hourly_rate'
  | 'starting_rate'
  | 'rate_unit'
  | 'profile_photo_path'
  | 'business_logo_path'
  | 'pricing_model'
  | 'starting_price'
  | 'min_job_price'
  | 'what_included'
  | 'min_hours'
  | 'overtime_rate'
  | 'travel_fee_enabled'
  | 'travel_fee_base'
  | 'travel_free_within_miles'
  | 'service_radius_miles'
  | 'travel_extra_per_mile'
  | 'same_day_bookings'
  | 'emergency_available';

/** Upsert pro_profiles (rates, paths, pricing, travel, availability) */
export async function updateProProfile(
  userId: string,
  params: Partial<Pick<ProProfile, ProProfileUpdateKeys>>
): Promise<{ success: boolean; error?: string }> {
  const payload: Record<string, unknown> = { user_id: userId };
  const keys: ProProfileUpdateKeys[] = [
    'hourly_rate', 'starting_rate', 'rate_unit', 'profile_photo_path', 'business_logo_path',
    'pricing_model', 'starting_price', 'min_job_price', 'what_included', 'min_hours', 'overtime_rate',
    'travel_fee_enabled', 'travel_fee_base', 'travel_free_within_miles', 'service_radius_miles',
    'travel_extra_per_mile', 'same_day_bookings', 'emergency_available',
  ];
  for (const k of keys) {
    if ((params as Record<string, unknown>)[k] !== undefined) {
      payload[k] = (params as Record<string, unknown>)[k];
    }
  }

  const { error } = await supabase.from('pro_profiles').upsert(payload, { onConflict: 'user_id' });
  if (error) {
    console.error('[proProfile] updateProProfile error:', error.status, error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/** Upload profile photo to avatars bucket and persist path to pro_profiles + profiles.avatar_url */
export async function uploadProfilePhoto(
  userId: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  const ext = safeExtFromFile(file);
  const path = `${userId}/profile.${ext}`;

  const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || undefined,
  });
  if (uploadErr) {
    console.error('[proProfile] uploadProfilePhoto storage error:', uploadErr.status, uploadErr.message);
    return { success: false, error: uploadErr.message };
  }

  const url = getStoragePublicUrl('avatars', path);
  const updateRes = await updateProProfile(userId, { profile_photo_path: path });
  if (!updateRes.success) return { success: false, error: updateRes.error };

  // Sync to profiles.avatar_url for backward compatibility
  const { error: profErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
  if (profErr) console.warn('[proProfile] profiles.avatar_url sync failed:', profErr.message);

  return { success: true, url };
}

/** Upload business logo to logos bucket and persist path to pro_profiles + service_pros.logo_url */
export async function uploadBusinessLogo(
  userId: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  const ext = safeExtFromFile(file);
  const path = `${userId}/logo.${ext}`;

  const { error: uploadErr } = await supabase.storage.from('logos').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || undefined,
  });
  if (uploadErr) {
    console.error('[proProfile] uploadBusinessLogo storage error:', uploadErr.status, uploadErr.message);
    return { success: false, error: uploadErr.message };
  }

  const url = getStoragePublicUrl('logos', path);
  const updateRes = await updateProProfile(userId, { business_logo_path: path });
  if (!updateRes.success) return { success: false, error: updateRes.error };

  // Sync to service_pros.logo_url for backward compatibility
  const { error: spErr } = await supabase.from('service_pros').update({ logo_url: url }).eq('user_id', userId);
  if (spErr) console.warn('[proProfile] service_pros.logo_url sync failed:', spErr.message);

  return { success: true, url };
}

/** Remove profile photo (clear path and sync) */
export async function removeProfilePhoto(userId: string): Promise<{ success: boolean; error?: string }> {
  const prof = await getProProfile(userId);
  const path = prof?.profile_photo_path;
  if (path) {
    await supabase.storage.from('avatars').remove([path]);
  }
  await updateProProfile(userId, { profile_photo_path: null });
  await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
  return { success: true };
}

/** Remove business logo (clear path and sync) */
export async function removeBusinessLogo(userId: string): Promise<{ success: boolean; error?: string }> {
  const prof = await getProProfile(userId);
  const path = prof?.business_logo_path;
  if (path) {
    await supabase.storage.from('logos').remove([path]);
  }
  await updateProProfile(userId, { business_logo_path: null });
  await supabase.from('service_pros').update({ logo_url: null }).eq('user_id', userId);
  return { success: true };
}

/** List certifications for user */
export async function listProCertifications(userId: string): Promise<ProCertification[]> {
  const { data, error } = await supabase
    .from('pro_certifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[proProfile] listProCertifications error:', error.status, error.message);
    return [];
  }
  return (data ?? []) as ProCertification[];
}

/** Add certification with optional file upload */
export async function addProCertification(
  userId: string,
  params: { title: string; issuer?: string; issue_date?: string; expires_at?: string; file?: File }
): Promise<{ success: boolean; cert?: ProCertification; error?: string }> {
  const certId = crypto.randomUUID();
  let filePath: string | null = null;

  if (params.file) {
    const ext = safeExtFromFile(params.file);
    filePath = `${userId}/${certId}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('certifications').upload(filePath, params.file, {
      cacheControl: '3600',
      upsert: false,
      contentType: params.file.type || undefined,
    });
    if (uploadErr) {
      console.error('[proProfile] addProCertification upload error:', uploadErr.status, uploadErr.message);
      return { success: false, error: uploadErr.message };
    }
  }

  const { data, error } = await supabase
    .from('pro_certifications')
    .insert({
      user_id: userId,
      title: params.title.trim(),
      issuer: params.issuer?.trim() || null,
      issue_date: params.issue_date || null,
      expires_at: params.expires_at || null,
      file_path: filePath,
    })
    .select()
    .single();
  if (error) {
    console.error('[proProfile] addProCertification insert error:', error.status, error.message);
    return { success: false, error: error.message };
  }
  return { success: true, cert: data as ProCertification };
}

/** Delete certification and its file */
export async function deleteProCertification(userId: string, certId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('pro_certifications')
    .select('file_path')
    .eq('id', certId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  if (data?.file_path) {
    await supabase.storage.from('certifications').remove([data.file_path]);
  }
  const { error: delErr } = await supabase.from('pro_certifications').delete().eq('id', certId).eq('user_id', userId);
  if (delErr) return { success: false, error: delErr.message };
  return { success: true };
}

/** Resolve profile photo URL: prefer pro_profiles path, else profiles.avatar_url */
export async function getProfilePhotoUrl(userId: string): Promise<string | null> {
  const prof = await getProProfile(userId);
  if (prof?.profile_photo_path) {
    return getStoragePublicUrl('avatars', prof.profile_photo_path);
  }
  const { data } = await supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle();
  return (data as { avatar_url?: string })?.avatar_url ?? null;
}

/** Resolve business logo URL: prefer pro_profiles path, else service_pros.logo_url */
export async function getBusinessLogoUrl(userId: string): Promise<string | null> {
  const prof = await getProProfile(userId);
  if (prof?.business_logo_path) {
    return getStoragePublicUrl('logos', prof.business_logo_path);
  }
  const { data } = await supabase.from('service_pros').select('logo_url').eq('user_id', userId).maybeSingle();
  return (data as { logo_url?: string })?.logo_url ?? null;
}
