import { createAdminSupabaseClient } from '@/lib/supabaseServer';

type Severity = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

function safeStringify(v: unknown, maxLen = 4000): string | null {
  try {
    const s = JSON.stringify(v);
    if (!s) return null;
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  } catch {
    return null;
  }
}

function safeText(v: unknown, max = 2000): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function getRelease(): string | null {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_DEPLOYMENT_ID ??
    null
  );
}

/**
 * Best-effort server-side error logging to `public.error_events`.
 * Uses the service role key (bypasses RLS). Never throws.
 *
 * IMPORTANT: Do not pass PII (addresses, full notes, card data, etc.) in `meta`.
 */
export async function recordServerErrorEvent(input: {
  message: string;
  severity?: Severity;
  route?: string | null;
  url?: string | null;
  userId?: string | null;
  stack?: string | null;
  meta?: Record<string, unknown>;
}) {
  const message = safeText(input.message, 2000);
  if (!message) return false;

  let admin: ReturnType<typeof createAdminSupabaseClient> | null = null;
  try {
    admin = createAdminSupabaseClient();
  } catch {
    // If not configured, we still want the app to run.
    return false;
  }

  const severity: Severity = input.severity ?? 'error';
  const route = safeText(input.route, 500);
  const url = safeText(input.url, 2000);
  const stack = safeText(input.stack, 8000);
  const release = getRelease();

  const meta = input.meta ?? {};
  // Guardrail: if meta is huge or non-serializable, store a minimal representation.
  const metaJson = safeStringify(meta) ? meta : { meta: safeStringify(meta) };

  try {
    await admin.from('error_events').insert({
      source: 'server',
      severity,
      message,
      stack,
      url,
      route,
      release,
      user_id: input.userId ?? null,
      meta: metaJson,
    });
    return true;
  } catch {
    return false;
  }
}

