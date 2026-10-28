'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LogoMark from '@/components/LogoMark'
import { supabase } from '@/utils/supabase'

/**
 * Where the "reset your password" email lands. Supabase signs the person in from the link
 * (a short-lived recovery session); here they choose a new password.
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // The link either signs them in straight away, or fires PASSWORD_RECOVERY a moment later.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) setReady(true)
    })
    void supabase.auth.getSession().then(({ data: { session } }) => { if (session) setReady(true) })
    const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search)
    if (params.get('error_code') || params.get('error')) setExpired(true)
    const timer = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => { if (!session) setExpired(true) })
    }, 4000)
    return () => { listener.subscription.unsubscribe(); window.clearTimeout(timer) }
  }, [])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Use at least 8 characters.'); return }
    if (password !== confirm) { setError('The two passwords don’t match.'); return }
    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (updateError) { setError(updateError.message); return }
    setDone(true)
    window.setTimeout(() => router.replace('/dashboard'), 1500)
  }

  const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-300'

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 pb-24">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <LogoMark size={44} className="mb-4" />
        <h1 className="text-xl font-bold tracking-tight">Set a new password</h1>
        {done
          ? <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-300">Password changed. Taking you to Today…</p>
          : expired && !ready
            ? <>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">This reset link has expired or was already used. Ask for a new one from the sign-in page.</p>
              <Link href="/login" className="mt-5 inline-block text-sm font-semibold underline underline-offset-2">Back to sign in</Link>
            </>
            : <form onSubmit={save} className="mt-4 space-y-3">
              <label className="block text-sm font-semibold">New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required className={`${field} mt-1`} placeholder="At least 8 characters" /></label>
              <label className="block text-sm font-semibold">Type it again<input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength={8} required className={`${field} mt-1`} /></label>
              {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
              <button type="submit" disabled={saving || !ready} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900">{saving ? 'Saving…' : ready ? 'Save new password' : 'Checking your link…'}</button>
            </form>}
      </section>
    </main>
  )
}
