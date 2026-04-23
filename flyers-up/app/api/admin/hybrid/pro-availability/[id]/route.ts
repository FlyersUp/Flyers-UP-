import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/(app)/admin/_admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z
  .object({
    activeThisWeek: z.boolean().optional(),
    paused: z.boolean().optional(),
  })
  .refine((value) => value.activeThisWeek !== undefined || value.paused !== undefined, {
    message: 'At least one field is required',
  });

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(supabase, user))) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.activeThisWeek !== undefined) {
    updatePayload.is_active_this_week = parsed.data.activeThisWeek;
  }
  if (parsed.data.paused !== undefined) {
    updatePayload.is_paused = parsed.data.paused;
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from('service_pros')
    .update(updatePayload)
    .eq('id', id)
    .select('id, is_active_this_week, is_paused')
    .maybeSingle();

  if (error) {
    console.error('[pro-availability PATCH]', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ ok: false, error: 'Pro not found' }, { status: 404 });
  }

  return Response.json({
    ok: true,
    row: {
      id: String(data.id),
      activeThisWeek: Boolean(data.is_active_this_week),
      paused: Boolean(data.is_paused),
    },
  });
}
