'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, LockKeyhole, Users } from 'lucide-react'
import { examLabel } from '@/lib/exams'
import { supabase } from '@/utils/supabase'

interface Preview { circle_id: string; name: string; exam: string | null; owner_name: string; member_count: number; already_member: boolean }

export default function JoinCirclePage() {
  const params = useParams()
  const router = useRouter()
  const code = String(params.code || '')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace(`/login?next=${encodeURIComponent(`/circles/join/${code}`)}`); return }
      const { data, error: previewError } = await supabase.rpc('circle_invite_preview', { code })
      const row = Array.isArray(data) ? (data[0] as Preview | undefined) : undefined
      if (previewError || !row) setError('This invite link is not valid. Ask your mentor for a new one.')
      else if (row.already_member) { router.replace(`/circles/${row.circle_id}`); return }
      else setPreview(row)
      setLoading(false)
    }
    void load()
  }, [code, router])

  const join = async () => {
    setJoining(true); setError(null)
    const { data, error: joinError } = await supabase.rpc('join_circle_by_code', { code })
    if (joinError || !data) { setError(joinError?.message || 'You could not join this circle.'); setJoining(false); return }
    router.replace(`/circles/${data as string}`)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 pb-28">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]">
        {loading && <div className="mx-auto h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />}
        {!loading && preview && <>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-500"><Users className="h-7 w-7" /></span>
          <p className="mt-4 text-sm text-slate-500">{preview.owner_name} invited you to join</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">{preview.name}</h1>
          <p className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
            {examLabel(preview.exam) && <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 font-bold text-amber-700 dark:text-amber-300">{examLabel(preview.exam)}</span>}
            <span>{preview.member_count} {preview.member_count === 1 ? 'member' : 'members'}</span>
          </p>
          <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left text-sm text-slate-600 dark:text-slate-300">
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />Get your mentor&apos;s daily task</li>
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />Check in with one tap when it&apos;s done</li>
            <li className="flex gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />Only your mentor sees your check-ins here. Your personal goals stay private.</li>
          </ul>
          <button type="button" onClick={() => void join()} disabled={joining} className="mt-6 w-full rounded-2xl bg-amber-500 py-4 text-base font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-60">{joining ? 'Joining…' : 'Join circle'}</button>
        </>}
        {!loading && error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
        {!loading && !preview && <Link href="/circles" className="mt-4 inline-block text-sm font-bold text-amber-600 dark:text-amber-400">Go to circles</Link>}
      </section>
    </main>
  )
}
