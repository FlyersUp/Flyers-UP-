/**
 * POST /api/pro/insurance - Upload insurance document
 * DELETE /api/pro/insurance - Remove insurance document
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeExt(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png') return ext;
  return 'pdf';
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'pro') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file || !file.size) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ext = safeExt(file.name);
  const path = `${user.id}/insurance.${ext}`;

  const buf = await file.arrayBuffer();
  const { error: uploadErr } = await supabase.storage.from('insurance_docs').upload(path, buf, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || (ext === 'pdf' ? 'application/pdf' : `image/${ext}`),
  });

  if (uploadErr) {
    console.error('[insurance] upload error:', uploadErr);
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const admin = createAdminSupabaseClient();
  const { error: dbErr } = await admin.from('pro_safety_compliance_settings').upsert(
    { pro_user_id: user.id, insurance_doc_path: path },
    { onConflict: 'pro_user_id' }
  );

  if (dbErr) {
    console.error('[insurance] db update error:', dbErr);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ success: true, path });
}

export async function DELETE() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: row } = await admin
    .from('pro_safety_compliance_settings')
    .select('insurance_doc_path')
    .eq('pro_user_id', user.id)
    .single();

  const path = (row as { insurance_doc_path?: string } | null)?.insurance_doc_path;
  if (path) {
    await supabase.storage.from('insurance_docs').remove([path]);
  }

  await admin.from('pro_safety_compliance_settings').upsert(
    { pro_user_id: user.id, insurance_doc_path: null },
    { onConflict: 'pro_user_id' }
  );

  return NextResponse.json({ success: true });
}
