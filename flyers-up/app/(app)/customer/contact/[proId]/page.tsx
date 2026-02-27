/**
 * Contact Pro - Opens chat with a pro, creating a conversation only (no booking).
 * Message button without existing booking -> this page -> redirects to conversation chat.
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

  // Check for existing conversation with this pro
  const { data: existingConv } = await admin
    .from('conversations')
    .select('id')
    .eq('customer_id', user.id)
    .eq('pro_id', proId)
    .maybeSingle();

  if (existingConv?.id) {
    redirect(`/customer/chat/conversation/${existingConv.id}`);
  }

  // Check for existing booking with this pro (can message via booking)
  const { data: existingBooking } = await admin
    .from('bookings')
    .select('id')
    .eq('customer_id', user.id)
    .eq('pro_id', proId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingBooking?.id) {
    redirect(`/customer/chat/${existingBooking.id}`);
  }

  // Verify pro exists
  const { data: pro } = await admin
    .from('service_pros')
    .select('id')
    .eq('id', proId)
    .maybeSingle();

  if (!pro) redirect('/customer/messages');

  // Create conversation only (no booking)
  const { data: created, error } = await admin
    .from('conversations')
    .insert({
      customer_id: user.id,
      pro_id: proId,
    })
    .select('id')
    .single();

  if (error || !created?.id) {
    console.error('Contact: failed to create conversation', error);
    redirect('/customer/messages');
  }

  redirect(`/customer/chat/conversation/${created.id}`);
}
