/**
 * Direct Supabase health check (bypasses proxy).
 * Use in client components to check if Supabase is reachable.
 * @param timeoutMs - Abort after this many ms (default 3000)
 */
export async function supabaseHealth(timeoutMs = 3000): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase not configured');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const res = await fetch(`${url}/auth/v1/health`, {
    method: 'GET',
    headers: { apikey: anonKey },
    cache: 'no-store',
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!res.ok) throw new Error(`Supabase health failed: ${res.status}`);
  return true;
}
