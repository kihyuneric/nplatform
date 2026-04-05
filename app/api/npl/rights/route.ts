import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth/get-user';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let _userId = 'anonymous';
  try { const user = await getAuthUser(); if (user) _userId = user.id; } catch {}
  if (_userId === 'anonymous') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const body = await request.json();

  // If it's an array, bulk insert
  if (Array.isArray(body)) {
    const { data, error } = await supabase
      .from('npl_case_rights')
      .insert(body)
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from('npl_case_rights')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  let _userId = 'anonymous';
  try { const user = await getAuthUser(); if (user) _userId = user.id; } catch {}
  if (_userId === 'anonymous') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const body = await request.json();
  const { id, ...updateData } = body;

  const { data, error } = await supabase
    .from('npl_case_rights')
    .update(updateData)
    .eq('id', id)
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
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const { error } = await supabase
    .from('npl_case_rights')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
