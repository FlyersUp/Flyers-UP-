export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

function nowIso() {
  return new Date().toISOString();
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-error-test-token') ?? '';
  const expected = process.env.ERROR_TEST_TOKEN ?? '';
  if (!expected || token !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Trigger a "fatal" report through the normal ingestion route so Slack logic is exercised.
  const origin = req.nextUrl.origin;
  const res = await fetch(`${origin}/api/errors`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      source: 'server',
      severity: 'fatal',
      message: `Slack alert test (${nowIso()})`,
      route: '/api/errors/test',
      url: `${origin}/api/errors/test`,
      meta: { kind: 'slack-alert-test' },
    }),
  });

  const text = await res.text().catch(() => '');
  return NextResponse.json(
    {
      ok: res.ok,
      upstreamStatus: res.status,
      upstreamBody: text,
    },
    { status: res.ok ? 200 : 500 }
  );
}

