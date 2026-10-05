import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const requestedNext = searchParams.get('next')
  const nextPath = requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/feed'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Middleware handles cookie writes
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_onboarded')
        .eq('id', data.user.id)
        .single()

      if (!profile || !profile.is_onboarded) {
        return NextResponse.redirect(`${origin}/settings?onboarding=1`)
      }

      return NextResponse.redirect(`${origin}${nextPath}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
