import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth/get-user';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let userId = 'anonymous';
  try { const user = await getAuthUser(); if (user) userId = user.id; } catch {}
  if (userId === 'anonymous') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const body = await request.json();

  // Upsert - update if exists, create if not
  const { data: existing } = await supabase
    .from('npl_case_assumptions')
    .select('id')
    .eq('case_id', body.case_id)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('npl_case_assumptions')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('case_id', body.case_id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from('npl_case_assumptions')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
