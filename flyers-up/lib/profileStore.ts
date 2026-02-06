import { supabase } from '@/lib/supabaseClient';
import { updateMyProfileAction, type UpdateMyProfileParams } from '@/app/actions/profile';
import { updateMyServiceProAction } from '@/app/actions/servicePro';
import { getMyServicePro, type ServiceProProfile } from '@/lib/api';

export type CustomerProfile = {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  firstName: string | null;
  zipCode: string | null;
};

export async function loadCustomerProfile(userId: string): Promise<CustomerProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, avatar_url, first_name, zip_code')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    email: (data as any).email ?? null,
    fullName: (data as any).full_name ?? null,
    phone: (data as any).phone ?? null,
    avatarUrl: (data as any).avatar_url ?? null,
    firstName: (data as any).first_name ?? null,
    zipCode: (data as any).zip_code ?? null,
  };
}

export async function saveCustomerProfile(
  params: UpdateMyProfileParams
): Promise<{ success: boolean; error?: string; profile?: CustomerProfile }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? undefined;

  const res = await updateMyProfileAction(params, token);
  if (!res.success) return { success: false, error: res.error || 'Failed to save.' };

  // Read-after-write verification (source of truth).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not signed in.' };
  const fresh = await loadCustomerProfile(user.id);
  if (!fresh) return { success: false, error: 'Saved, but could not re-load your profile.' };
  return { success: true, profile: fresh };
}

export async function loadProProfile(userId: string): Promise<ServiceProProfile | null> {
  return await getMyServicePro(userId);
}

export async function saveProProfile(
  params: Parameters<typeof updateMyServiceProAction>[0]
): Promise<{ success: boolean; error?: string; pro?: ServiceProProfile }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? undefined;

  const res = await updateMyServiceProAction(params as any, token);
  if (!res.success) return { success: false, error: res.error || 'Failed to save.' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not signed in.' };
  const fresh = await loadProProfile(user.id);
  if (!fresh) return { success: false, error: 'Saved, but could not re-load your pro profile.' };
  return { success: true, pro: fresh };
}

