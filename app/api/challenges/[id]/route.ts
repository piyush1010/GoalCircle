import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Required for Next.js static builds (`output: 'export'`)
export function generateStaticParams() {
  return [{ id: '1' }];
}

export const dynamicParams = false;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: challengeId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!['accepted', 'declined'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be accepted or declined.' },
        { status: 400 }
      );
    }

    // Initialize Supabase Server Client with Cookie Store
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Handled when called from Server Components
            }
          },
        },
      }
    );

    // Validate User Session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized user.' },
        { status: 401 }
      );
    }

    // Update Challenge Invitation Status in Supabase
    const { data, error } = await supabase
      .from('challenge_invites')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', challengeId)
      .eq('recipient_id', user.id) // Ensure user only updates challenges sent to them
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Challenge status updated successfully', data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
