'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Composer, { type Place } from '@/components/communities/Composer'
import { CATEGORY_COMMUNITIES, describe, isExamCommunity, type CommunityRow } from '@/lib/communities'
import { supabase } from '@/utils/supabase'

/** Ask a question from the + button: pick one of your communities and write it. */
export default function AskPage() {
  const router = useRouter()
  const [wanted, setWanted] = useState('')
  const [places, setPlaces] = useState<Place[] | null>(null)

  useEffect(() => {
    void (async () => {
      const wanted = new URLSearchParams(window.location.search).get('c') ?? ''
      setWanted(wanted)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace('/login?next=/discuss/new'); return }
      const { data } = await supabase.rpc('community_overview')
      const rows = ((data ?? []) as CommunityRow[]).filter((r) => r.member || r.key === wanted)
      // Exams first, then the rest in the order Communities shows them.
      rows.sort((a, b) => Number(isExamCommunity(b.key)) - Number(isExamCommunity(a.key)))
      const list = rows.map((r) => ({ key: r.key, name: describe(r.key).name }))
      if (wanted && !list.some((p) => p.key === wanted) && (isExamCommunity(wanted) || wanted in CATEGORY_COMMUNITIES)) list.unshift({ key: wanted, name: describe(wanted).name })
      setPlaces(list)
    })()
  }, [router])

  return <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
    <div className="flex h-10 items-center"><button type="button" onClick={() => { if (window.history.length > 1) router.back(); else router.push('/circles') }} aria-label="Back" className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowLeft className="h-5 w-5" /></button></div>
    <h1 className="mt-2 text-[26px] font-bold tracking-tight">Ask your community</h1>
    <p className="mt-1 text-sm text-slate-500">People working towards the same thing will see it, and can answer.</p>
    <div className="mt-5">
      {places === null && <div className="h-56 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" aria-busy="true" />}
      {places?.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
        <p className="font-semibold">You’re not in a community yet</p>
        <p className="mt-1 text-sm text-slate-500">Join one first, then ask away.</p>
        <Link href="/circles" className="mt-4 inline-block rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">See communities</Link>
      </div>}
      {places && places.length > 0 && <Composer places={places} initialPlace={wanted || places[0].key} onDone={(post) => router.replace(`/discuss/${post.id}`)} />}
    </div>
  </main>
}
