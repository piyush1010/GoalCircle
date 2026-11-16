'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, UserX } from 'lucide-react'
import ProfileAvatar from '@/components/ProfileAvatar'
import { supabase } from '@/utils/supabase'

interface Person { id: string; name: string; avatar: string | null }

/** Settings: the people you've blocked, each with Unblock. */
export default function BlockedPeople({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [people, setPeople] = useState<Person[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || people) return
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: rows } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', session.user.id)
      const ids = ((rows ?? []) as { blocked_id: string }[]).map((r) => r.blocked_id)
      const { data: profiles } = ids.length ? await supabase.from('profiles').select('id,full_name,display_name,avatar_url').in('id', ids) : { data: [] }
      const byId = new Map(((profiles ?? []) as Array<Record<string, string | null>>).map((p) => [String(p.id), p]))
      setPeople(ids.map((id) => { const p = byId.get(id); return { id, name: String(p?.full_name || p?.display_name || 'GoalYaar member'), avatar: p?.avatar_url ?? null } }))
    })()
  }, [open, people])

  const unblock = async (person: Person) => {
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error: e } = await supabase.from('blocks').delete().eq('blocker_id', session.user.id).eq('blocked_id', person.id)
    if (e) { setError('That didn’t work. Please try again.'); return }
    setPeople((cur) => (cur ?? []).filter((p) => p.id !== person.id))
  }

  return <div>
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={className}>
      <UserX className="h-5 w-5 shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Blocked people</span><span className="block text-sm text-slate-500">People whose posts and answers you don’t see</span></span>
      <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="px-4 pb-3">
      {people === null && <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />}
      {people?.length === 0 && <p className="text-sm text-slate-500">You haven’t blocked anyone.</p>}
      <ul className="space-y-2">
        {people?.map((p) => <li key={p.id} className="flex items-center gap-3">
          <ProfileAvatar value={p.avatar} name={p.name} size={32} className="rounded-full" />
          <span className="min-w-0 flex-1 truncate text-[15px]">{p.name}</span>
          <button type="button" onClick={() => void unblock(p)} className="h-9 rounded-xl border border-slate-200 px-3 text-sm font-semibold dark:border-slate-700">Unblock</button>
        </li>)}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
    </div>}
  </div>
}
