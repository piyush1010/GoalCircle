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
      : '/profile'
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_onboarded')
        .eq('id', data.session.user.id)
        .maybeSingle()

      if (!isActive) return

      if (!profile?.is_onboarded) {
        setMessage('Preparing your profile…')
        router.replace(`/settings?onboarding=1&next=${encodeURIComponent(nextPath)}`)
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
