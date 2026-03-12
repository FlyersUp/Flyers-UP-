/**
 * POST /api/bookings/[bookingId]/complete/photos
 * Upload after photo for job completion. Returns public URL.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: proRow } = await supabase
    .from('service_pros')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!proRow?.id) return NextResponse.json({ error: 'Pro not found' }, { status: 403 });

  const admin = createAdminSupabaseClient();
  const { data: booking } = await admin
    .from('bookings')
    .select('id, pro_id')
    .eq('id', id)
    .eq('pro_id', proRow.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Valid image file required' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${user.id}/completion-photos/${id}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from('profile-images')
    .upload(path, file, { upsert: true });

  if (uploadErr) {
    console.error('Completion photo upload failed', uploadErr);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(path);
  return NextResponse.json({ url: urlData.publicUrl });
}
