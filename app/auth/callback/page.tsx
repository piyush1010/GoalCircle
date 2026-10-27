'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { LoaderCircle, Target } from 'lucide-react'

function OAuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('Finishing your sign in…')

  const nextPath = useMemo(() => {
    const requestedNext = searchParams.get('next')
    return requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : '/dashboard'
  }, [searchParams])

  useEffect(() => {
    let isActive = true

    const finishSignIn = async () => {
      const { data, error } = await supabase.auth.getSession()

      // OAuth access and refresh tokens arrive in the URL fragment. Once the
      // Supabase client has stored them, remove them from the address bar.
      if (window.location.hash) {
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}`
        )
      }

      if (!isActive) return

      if (error || !data.session?.user) {
        router.replace('/login?error=oauth_failed')
        return
      }

      const user = data.session.user
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_onboarded')
        .eq('id', user.id)
        .maybeSingle()

      if (!isActive) return

      // New here: create the profile from the Google account and open Today, where Goalie's tour starts.
      if (!profile?.is_onboarded) {
        setMessage('Preparing your profile…')
        const meta = user.user_metadata || {}
        const fullName = String(meta.full_name || meta.name || user.email?.split('@')[0] || 'GoalYaar member').slice(0, 60)
        const base = (user.email?.split('@')[0] || 'member').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 24) || 'member'
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const username = attempt === 0 ? base : `${base}${Math.floor(100 + Math.random() * 900)}`
          const { error: profileError } = await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, username, avatar_url: meta.avatar_url || meta.picture || null, is_onboarded: true, updated_at: new Date().toISOString() })
          if (!profileError) { await supabase.auth.updateUser({ data: { full_name: fullName, handle: `@${username}` } }); break }
          if (profileError.code !== '23505') break // not a username clash: carry on, Profile can fix it
        }
        if (!isActive) return
        router.replace(nextPath)
        return
      }

      router.replace(nextPath)
    }

    finishSignIn()

    return () => {
      isActive = false
    }
  }, [nextPath, router])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-6 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="text-center">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-amber-500 text-slate-950"><Target className="h-6 w-6" /></span>
        <h1 className="text-xl font-black">{message}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          <LoaderCircle className="mr-1.5 inline h-4 w-4 animate-spin" /> You will be redirected automatically.
        </p>
      </div>
    </main>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OAuthCallback />
    </Suspense>
  )
}
