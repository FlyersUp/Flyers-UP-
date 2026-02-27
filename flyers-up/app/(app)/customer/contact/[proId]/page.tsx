/**
 * Contact Pro - Opens chat with a pro, creating a minimal "contact" booking if needed.
 * Message button without existing booking -> this page -> redirects to chat.
 */

import { redirect } from 'next/navigation';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

type RouteParams = { proId?: string };

export default async function ContactProPage({ params }: { params: Promise<RouteParams> }) {
  const resolved = await params;
  const proId = resolved?.proId;
  if (!proId) redirect('/customer/messages');

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth?role=customer&next=${encodeURIComponent(`/customer/contact/${proId}`)}`);
  }

  const admin = createAdminSupabaseClient();

  // Check for existing booking with this pro
  const { data: existing } = await admin
    .from('bookings')
    .select('id')
    .eq('customer_id', user.id)
    .eq('pro_id', proId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    redirect(`/customer/chat/${existing.id}`);
  }

  // Verify pro exists
  const { data: pro } = await admin
    .from('service_pros')
    .select('id')
    .eq('id', proId)
    .maybeSingle();

  if (!pro) redirect('/customer/messages');

  // Create minimal "contact" booking (inquiry) so customer can message the pro
  const today = new Date().toISOString().slice(0, 10);
  const { data: created, error } = await admin
    .from('bookings')
    .insert({
      customer_id: user.id,
      pro_id: proId,
      service_date: today,
      service_time: 'TBD',
      address: 'To be confirmed',
      notes: 'Contact request – details to be discussed',
      status: 'requested',
      status_history: [{ status: 'requested', at: new Date().toISOString() }],
    })
    .select('id')
    .single();

  if (error || !created?.id) {
    console.error('Contact: failed to create booking', error);
    redirect('/customer/messages');
  }

  redirect(`/customer/chat/${created.id}`);
}
