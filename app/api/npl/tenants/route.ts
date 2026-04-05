import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth/get-user';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let _userId = 'anonymous';
  try { const user = await getAuthUser(); if (user) _userId = user.id; } catch {}
  if (_userId === 'anonymous') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const body = await request.json();

  // Support bulk insert: { case_id, tenants: [...] }
  if (body.case_id && body.tenants && Array.isArray(body.tenants)) {
    const tenantRows = body.tenants.map((t: Record<string, unknown>) => ({
      case_id: body.case_id,
      tenant_name: t.tenant_name || '',
      move_in_date: t.move_in_date || null,
      fixed_date: t.fixed_date || null,
      deposit: t.deposit || 0,
      monthly_rent: t.monthly_rent || 0,
      has_opposition_right: t.has_opposition_right || false,
      priority_repayment: t.priority_repayment || 0,
      risk_level: t.risk_level || '양호',
      notes: t.notes || null,
    }));

    const { data, error } = await supabase
      .from('npl_case_tenants')
      .insert(tenantRows)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Single insert (array or object)
  if (Array.isArray(body)) {
    const { data, error } = await supabase
      .from('npl_case_tenants')
      .insert(body)
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from('npl_case_tenants')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  let _userId = 'anonymous';
  try { const user = await getAuthUser(); if (user) _userId = user.id; } catch {}
  if (_userId === 'anonymous') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get('case_id');
  const id = searchParams.get('id');

  if (caseId) {
    const { error } = await supabase
      .from('npl_case_tenants')
      .delete()
      .eq('case_id', caseId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (id) {
    const { error } = await supabase
      .from('npl_case_tenants')
      .delete()
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'case_id or id required' }, { status: 400 });
}
