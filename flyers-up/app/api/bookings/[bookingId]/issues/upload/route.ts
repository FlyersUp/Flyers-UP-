import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeExt(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || 'jpg';
  if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext)) return ext;
  return 'jpg';
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const bookingUuid = normalizeUuidOrNull(bookingId);
    if (!bookingUuid) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminSupabaseClient();
    const { data: booking } = await admin
      .from('bookings')
      .select('id, customer_id, pro_id, service_pros(user_id)')
      .eq('id', bookingUuid)
      .maybeSingle();

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    const proUserId = (booking.service_pros as { user_id?: string } | null)?.user_id ?? null;
    if (booking.customer_id !== user.id && proUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'A valid image file is required.' }, { status: 400 });
    }
    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: 'File too large. Max 8MB.' }, { status: 400 });
    }

    const ext = safeExt(file.name);
    const path = `${user.id}/booking-issues/${bookingUuid}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('profile-images')
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadErr) {
      console.error('Issue evidence upload failed:', uploadErr);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
    return NextResponse.json({ ok: true, url: data.publicUrl, path }, { status: 200 });
  } catch (err) {
    console.error('Issue evidence upload error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

