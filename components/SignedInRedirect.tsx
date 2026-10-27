'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'

/** On the landing page: people who are already signed in go straight to Today. */
export default function SignedInRedirect() {
  const router = useRouter()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => { if (session?.user) router.replace('/dashboard') })
  }, [router])
  return null
}
