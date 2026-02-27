export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';

const PERSIST_TIMEOUT_MS = 4000;

type ErrorEventInput = {
  source: 'client' | 'server';
  severity?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  stack?: string | null;
  url?: string | null;
  route?: string | null;
  release?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown>;
};

async function sendSlackAlert(payload: {
  message: string;
  severity: string;
  source: string;
  route: string | null;
  url: string | null;
  userId: string | null;
  release: string | null;
  eventId: string | null;
  createdAtIso: string | null;
}) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return false;

  const lines = [
    `*Severity*: ${payload.severity}`,
    `*Source*: ${payload.source}`,
    payload.route ? `*Route*: \`${payload.route}\`` : null,
    payload.url ? `*URL*: ${payload.url}` : null,
    payload.userId ? `*User*: \`${payload.userId}\`` : '*User*: (not logged in)',
    payload.release ? `*Release*: \`${payload.release}\`` : null,
    payload.eventId ? `*Event ID*: \`${payload.eventId}\`` : null,
    payload.createdAtIso ? `*Time*: ${payload.createdAtIso}` : null,
  ].filter(Boolean);

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      text: `Flyers Up alert: ${payload.severity} (${payload.source})`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: 'Flyers Up crash alert', emoji: false },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*${payload.message}*` },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: lines.join('\n') },
        },
      ],
    }),
  });

  return res.ok;
}

function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || null;
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  return null;
}

function safeText(v: unknown, max = 5000): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function sleep(ms: number): Promise<'timeout'> {
  return new Promise((resolve) => setTimeout(() => resolve('timeout'), ms));
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!raw || raw.trim() === '') {
    return NextResponse.json({ ok: false, error: 'Empty body' }, { status: 400 });
  }

  let body: ErrorEventInput | null = null;
  try {
    body = JSON.parse(raw) as ErrorEventInput;
  } catch {
    console.warn('error-report parse failed', {
      contentType: req.headers.get('content-type'),
      rawLen: raw.length,
    });
    try {
      const params = new URLSearchParams(raw);
      const message = params.get('message');
      const source = params.get('source') as 'client' | 'server' | null;
      body = message
        ? ({
            source: source === 'server' ? 'server' : 'client',
            message,
            severity: (params.get('severity') as any) ?? 'error',
          } as ErrorEventInput)
        : null;
    } catch {
      body = null;
    }
  }

  const message = safeText(body?.message, 2000);
  const source = body?.source === 'server' ? 'server' : 'client';
  const severity = (body?.severity ?? 'error') as ErrorEventInput['severity'];

  if (!message) {
    return NextResponse.json({ ok: false, error: 'Missing message' }, { status: 400 });
  }

  const stack = safeText(body?.stack, 8000);
  const url = safeText(body?.url, 2000);
  const route = safeText(body?.route, 500);
  const userAgent = safeText(body?.userAgent, 500);
  const release =
    safeText(body?.release, 100) ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_DEPLOYMENT_ID ??
    null;
  const ip = getClientIp(req);

  let admin: ReturnType<typeof createAdminSupabaseClient> | null = null;
  try {
    admin = createAdminSupabaseClient();
  } catch {
    admin = null;
  }
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Server not configured for error reporting' }, { status: 503 });
  }

  const persistWork = async (): Promise<{ persisted: boolean; alerted?: boolean }> => {
    let userId: string | null = null;
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      userId = null;
    }

    const { data: inserted, error } = await admin!
      .from('error_events')
      .insert({
        source,
        severity: severity ?? 'error',
        message,
        stack,
        url,
        route,
        release,
        user_id: userId,
        user_agent: userAgent,
        ip_address: ip,
        meta: body?.meta ?? {},
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.warn('error_events insert failed', (error as any).message);
      return { persisted: false };
    }

    let alerted = false;
    if (severity === 'fatal') {
      try {
        alerted = await sendSlackAlert({
          message,
          severity: severity ?? 'error',
          source,
          route,
          url,
          userId,
          release,
          eventId: inserted?.id ?? null,
          createdAtIso: inserted?.created_at ? new Date(inserted.created_at as any).toISOString() : null,
        });
      } catch (e) {
        console.warn('slack alert failed', e);
      }
    }

    return { persisted: true, alerted };
  };

  const result = await Promise.race([
    persistWork(),
    sleep(PERSIST_TIMEOUT_MS).then(() => ({ persisted: false } as const)),
  ]);

  return NextResponse.json(
    { ok: true, persisted: result.persisted, alerted: result.alerted ?? false },
    { status: 200 }
  );
}

