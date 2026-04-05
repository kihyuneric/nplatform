import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth/get-user';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  let userId = 'anonymous';
  try { const user = await getAuthUser(); if (user) userId = user.id; } catch {}

  if (userId === 'anonymous') {
    return NextResponse.json([], { status: 200 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('npl_cases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  let postUserId = 'anonymous';
  try { const user = await getAuthUser(); if (user) postUserId = user.id; } catch {}
  if (postUserId === 'anonymous') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const body = await request.json();
  const { data, error } = await supabase
    .from('npl_cases')
    .insert({ ...body, user_id: postUserId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
