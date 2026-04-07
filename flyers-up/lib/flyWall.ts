import { supabase } from '@/lib/supabaseClient';

export type FlyWallEntry = {
  completionId: string;
  bookingId: string;
  completedAt: string;
  proId: string;
  proDisplayName: string;
  categoryName: string;
  neighborhoodLabel: string;
  beforePhotoUrls: string[];
  afterPhotoUrls: string[];
  customerRating: number | null;
  showPerfectRatingBadge: boolean;
  proAvatarUrl: string | null;
};

function mapFlyWallRow(row: Record<string, unknown>): FlyWallEntry {
  return {
    completionId: String(row.completion_id),
    bookingId: String(row.booking_id),
    completedAt: String(row.completed_at),
    proId: String(row.pro_id),
    proDisplayName: String(row.pro_display_name ?? 'Pro'),
    categoryName: String(row.category_name ?? 'Service'),
    neighborhoodLabel: String(row.neighborhood_label ?? 'Local area'),
    beforePhotoUrls: Array.isArray(row.before_photo_urls) ? (row.before_photo_urls as string[]) : [],
    afterPhotoUrls: Array.isArray(row.after_photo_urls) ? (row.after_photo_urls as string[]) : [],
    customerRating: typeof row.customer_rating === 'number' ? row.customer_rating : null,
    showPerfectRatingBadge: row.show_perfect_rating_badge === true,
    proAvatarUrl: typeof row.pro_avatar_url === 'string' ? row.pro_avatar_url : null,
  };
}

export async function fetchFlyWallEntries(limit: number, offset: number): Promise<FlyWallEntry[]> {
  const { data, error } = await supabase.rpc('rpc_fly_wall_entries', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    console.error('rpc_fly_wall_entries', error);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => mapFlyWallRow(row));
}

export type WeeklyLeaderboardRow = {
  rank: number;
  proId: string;
  proDisplayName: string;
  categoryName: string;
  jobsCompletedWeek: number;
  averageRating: number;
};

export async function fetchWeeklyLeaderboard(categoryId?: string | null): Promise<WeeklyLeaderboardRow[]> {
  const { data, error } = await supabase.rpc('rpc_weekly_leaderboard', {
    p_category_id: categoryId ?? null,
  });
  if (error) {
    console.error('rpc_weekly_leaderboard', error);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    rank: Number(row.rank),
    proId: String(row.pro_id),
    proDisplayName: String(row.pro_display_name ?? 'Pro'),
    categoryName: String(row.category_name ?? 'Service'),
    jobsCompletedWeek: Number(row.jobs_completed_week ?? 0),
    averageRating: Number(row.average_rating ?? 0),
  }));
}
