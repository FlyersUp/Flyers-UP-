/**
 * POST /api/conversations/[conversationId]/presence - Update presence (viewing conversation)
 * DELETE - Clear presence (left conversation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId } = await params;
    if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });

    const admin = createAdminSupabaseClient();
    await admin
      .from('conversation_presence')
      .upsert(
        {
          user_id: user.id,
          conversation_id: conversationId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,conversation_id' }
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[conversations/presence] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId } = await params;
    if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });

    const admin = createAdminSupabaseClient();
    await admin
      .from('conversation_presence')
      .delete()
      .eq('user_id', user.id)
      .eq('conversation_id', conversationId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[conversations/presence] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
