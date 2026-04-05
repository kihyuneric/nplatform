import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth/get-user';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId = 'anonymous';
  try { const user = await getAuthUser(); if (user) userId = user.id; } catch {}

  if (userId === 'anonymous') {
    return NextResponse.json(null, { status: 200 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('npl_cases')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let putUserId = 'anonymous';
  try { const user = await getAuthUser(); if (user) putUserId = user.id; } catch {}
  if (putUserId === 'anonymous') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const body = await request.json();
  const { data, error } = await supabase
    .from('npl_cases')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', putUserId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let delUserId = 'anonymous';
  try { const user = await getAuthUser(); if (user) delUserId = user.id; } catch {}
  if (delUserId === 'anonymous') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { error } = await supabase
    .from('npl_cases')
    .delete()
    .eq('id', id)
    .eq('user_id', delUserId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
