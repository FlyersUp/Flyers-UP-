import { NextRequest, NextResponse } from 'next/server';

// Proxy Supabase calls through our own domain to bypass regional blocks on *.supabase.co.
// This is intentionally lightweight: forward method/headers/body/querystring to Supabase.
//
// Notes:
// - We drop `set-cookie` from upstream responses (those cookies would be for supabase.co).
// - WebSocket Realtime is not supported via this HTTP proxy. (Auth/REST/Storage work.)

function getUpstreamBaseUrl(): string {
  // Prefer a non-public server-only env var if present (avoids accidental proxy loops).
  const upstream = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!upstream) {
    throw new Error('Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL');
  }
  return upstream.replace(/\/+$/, '');
}

function buildUpstreamUrl(req: NextRequest, pathSegments: string[]): string {
  const base = getUpstreamBaseUrl();
  const path = pathSegments.map(encodeURIComponent).join('/');
  const qs = req.nextUrl.searchParams.toString();
  return `${base}/${path}${qs ? `?${qs}` : ''}`;
}

function filterResponseHeaders(h: Headers): Headers {
  const out = new Headers();
  h.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === 'set-cookie') return;
    if (k === 'content-encoding') return;
    if (k === 'transfer-encoding') return;
    if (k === 'connection') return;
    out.set(key, value);
  });
  return out;
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = buildUpstreamUrl(req, path);

  const headers = new Headers(req.headers);
  // Avoid leaking internal host/origin details.
  headers.delete('host');
  headers.delete('origin');
  headers.delete('referer');

  const method = req.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.arrayBuffer();

  const upstreamRes = await fetch(url, {
    method,
    headers,
    body,
    redirect: 'manual',
  });

  const resHeaders = filterResponseHeaders(upstreamRes.headers);
  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: resHeaders,
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
export async function OPTIONS() {
  // Same-origin usage; respond minimally.
  return NextResponse.json({ ok: true });
}

