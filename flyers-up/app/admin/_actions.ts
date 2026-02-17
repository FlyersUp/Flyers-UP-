'use server';

import { redirect } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireAdminUser } from '@/app/admin/_admin';

type BookingStatus = 'requested' | 'accepted' | 'declined' | 'awaiting_payment' | 'completed' | 'cancelled';

function addQuery(path: string, key: string, value: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function asStatus(v: string | null): BookingStatus | null {
  const s = (v ?? '').trim().toLowerCase();
  if (
    s === 'requested' ||
    s === 'accepted' ||
    s === 'declined' ||
    s === 'awaiting_payment' ||
    s === 'completed' ||
    s === 'cancelled'
  ) {
    return s;
  }
  return null;
}

export async function adminSetBookingStatusAction(formData: FormData) {
  await requireAdminUser('/admin/bookings');

  const bookingId = String(formData.get('bookingId') ?? '').trim();
  const nextStatus = asStatus(formData.get('status') ? String(formData.get('status')) : null);
  const returnTo = String(formData.get('returnTo') ?? '/admin/bookings');

  if (!bookingId || !nextStatus) {
    redirect(addQuery(returnTo, 'error', 'Missing booking id or invalid status.'));
  }

  const admin = createAdminSupabaseClient();
  const { data: booking, error: readErr } = await admin
    .from('bookings')
    .select('id, status, status_history')
    .eq('id', bookingId)
    .maybeSingle();

  if (readErr || !booking) {
    redirect(addQuery(returnTo, 'error', readErr?.message || 'Booking not found.'));
  }

  const historyRaw = (booking as any)?.status_history;
  const history: Array<{ status: string; at: string }> = Array.isArray(historyRaw)
    ? historyRaw.filter((x) => x && typeof x.status === 'string' && typeof x.at === 'string')
    : [];

  const now = new Date().toISOString();
  const last = history.length ? history[history.length - 1] : null;
  const nextHistory = last?.status === nextStatus ? history : [...history, { status: nextStatus, at: now }];

  const { error: writeErr } = await admin
    .from('bookings')
    .update({
      status: nextStatus,
      status_history: nextHistory as any,
    })
    .eq('id', bookingId);

  if (writeErr) {
    redirect(addQuery(returnTo, 'error', writeErr.message));
  }

  redirect(addQuery(returnTo, 'ok', 'Booking updated.'));
}

export async function adminSetProAvailableAction(formData: FormData) {
  await requireAdminUser('/admin/users');

  const userId = String(formData.get('userId') ?? '').trim();
  const availableRaw = String(formData.get('available') ?? '').trim().toLowerCase();
  const returnTo = String(formData.get('returnTo') ?? '/admin/users');

  const available = availableRaw === 'true' || availableRaw === '1' || availableRaw === 'yes' || availableRaw === 'on';
  if (!userId) {
    redirect(addQuery(returnTo, 'error', 'Missing user id.'));
  }

  const admin = createAdminSupabaseClient();
  const { data: pro, error: readErr } = await admin
    .from('service_pros')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (readErr || !pro) {
    redirect(addQuery(returnTo, 'error', readErr?.message || 'service_pros row not found for this user.'));
  }

  const { error: writeErr } = await admin.from('service_pros').update({ available }).eq('user_id', userId);
  if (writeErr) {
    redirect(addQuery(returnTo, 'error', writeErr.message));
  }

  redirect(addQuery(returnTo, 'ok', 'Pro availability updated.'));
}

export async function adminUpdateCommandCenterInputsAction(formData: FormData) {
  await requireAdminUser('/admin/command-center');

  const marketingSpend = String(formData.get('marketing_spend') ?? '').trim();
  const cashBalance = String(formData.get('cash_balance') ?? '').trim();
  const payrollToggle = String(formData.get('payroll_toggle') ?? '0').trim();
  const returnTo = '/admin/command-center';

  const admin = createAdminSupabaseClient();

  async function upsert(key: string, value: string) {
    const { data: existing } = await admin
      .from('admin_inputs')
      .select('id')
      .eq('key', key)
      .is('month', null)
      .maybeSingle();
    const now = new Date().toISOString();
    if (existing?.id) {
      await admin.from('admin_inputs').update({ value, updated_at: now }).eq('id', (existing as { id: string }).id);
    } else {
      await admin.from('admin_inputs').insert({ key, value, month: null, updated_at: now });
    }
  }

  try {
    if (marketingSpend !== '') await upsert('marketing_spend', marketingSpend);
    if (cashBalance !== '') await upsert('cash_balance', cashBalance);
    await upsert('payroll_toggle', payrollToggle);
  } catch (e) {
    redirect(addQuery(returnTo, 'error', e instanceof Error ? e.message : 'Failed to save.'));
  }
  redirect(addQuery(returnTo, 'ok', 'Inputs saved.'));
}

