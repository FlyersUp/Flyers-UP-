/**
 * GET /api/discover/jobs
 * Recent completed jobs for neighborhood feed (public).
 */
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminSupabaseClient();

  const { data: completions, error } = await admin
    .from('job_completions')
    .select(`
      id,
      booking_id,
      after_photo_urls,
      completed_at,
      bookings(address, service_date),
      service_pros(display_name, id, rating)
    `)
    .order('completed_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Discover jobs query failed', error);
    return NextResponse.json({ jobs: [] });
  }

  const jobs = (completions ?? []).map((c: Record<string, unknown>) => {
    const booking = c.bookings as { address?: string } | null;
    const pro = c.service_pros as { display_name?: string; id?: string; rating?: number } | null;
    const addr = (booking?.address ?? '') as string;
    const neighborhood = addr.split(',')[1]?.trim() || addr.split(',')[0]?.trim() || 'Local';
    return {
      id: c.id,
      serviceType: 'Home Cleaning',
      neighborhood,
      proName: pro?.display_name ?? 'Pro',
      proId: pro?.id ?? '',
      rating: Number(pro?.rating ?? 0),
      beforePhotoUrls: [],
      afterPhotoUrls: (c.after_photo_urls as string[]) ?? [],
      completedAt: c.completed_at,
    };
  });

  return NextResponse.json({ jobs });
}
