'use client'

import { confirmAction } from '@/lib/confirm'
import { useCallback, useEffect, useState } from 'react'
import { Check, Search, UserPlus, UsersRound, X } from 'lucide-react'
import ProfileAvatar from '@/components/ProfileAvatar'
import { supabase } from '@/utils/supabase'

interface Profile {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

interface Collaboration {
  goal_id: string
  user_id: string
  invited_by: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

interface TeamMember extends Collaboration {
  profile: Profile | null
}

export default function GoalCollaborators({ goalId, ownerId, currentUserId }: { goalId: string; ownerId: string; currentUserId: string }) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const isOwner = ownerId === currentUserId

  const loadMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from('goal_collaborators')
      .select('goal_id,user_id,invited_by,status,created_at')
      .eq('goal_id', goalId)
      .neq('status', 'declined')
      .order('created_at')
    if (error) { setMessage('The shared-goal team could not be loaded.'); setLoading(false); return }
    const collaborations = (data || []) as Collaboration[]
    const ids = collaborations.map((item) => item.user_id)
    const { data: profiles } = ids.length
      ? await supabase.from('profiles').select('id,full_name,username,avatar_url').in('id', ids)
      : { data: [] }
    const profileMap = new Map(((profiles || []) as Profile[]).map((profile) => [profile.id, profile]))
    setMembers(collaborations.map((item) => ({ ...item, profile: profileMap.get(item.user_id) || null })))
    setLoading(false)
  }, [goalId])

  useEffect(() => { void Promise.resolve().then(loadMembers) }, [loadMembers])

  useEffect(() => {
    if (!isOwner || query.trim().length < 2) return
    const timer = window.setTimeout(async () => {
      setSearching(true)
      const term = query.trim().replace(/[^\p{L}\p{N} _.-]/gu, '')
      const { data } = await supabase
        .from('profiles')
        .select('id,full_name,username,avatar_url')
        .neq('id', currentUserId)
        .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
        .limit(8)
      const memberIds = new Set(members.map((member) => member.user_id))
      setResults(((data || []) as Profile[]).filter((profile) => !memberIds.has(profile.id)))
      setSearching(false)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [currentUserId, isOwner, members, query])

  const invite = async (profile: Profile) => {
    setBusyId(profile.id); setMessage(null)
    const { error } = await supabase.from('goal_collaborators').insert({
      goal_id: goalId,
      user_id: profile.id,
      invited_by: currentUserId,
    })
    setBusyId(null)
    if (error) { setMessage(error.code === '23505' ? 'That person already has an invitation.' : 'The invitation could not be sent.'); return }
    setQuery(''); setResults([]); setMessage('Invitation sent privately.'); await loadMembers()
  }

  const remove = async (member: TeamMember) => {
    const action = member.user_id === currentUserId ? 'leave this shared goal' : 'remove this collaborator'
    if (!(await confirmAction(`Are you sure you want to ${action}?`))) return
    setBusyId(member.user_id); setMessage(null)
    const { error } = await supabase.from('goal_collaborators').delete().eq('goal_id', goalId).eq('user_id', member.user_id)
    setBusyId(null)
    if (error) { setMessage('The team could not be updated.'); return }
    setMembers((current) => current.filter((item) => item.user_id !== member.user_id))
    setMessage(member.user_id === currentUserId ? 'You left this shared goal.' : 'Collaborator removed.')
  }

  const accepted = members.filter((member) => member.status === 'accepted')
  const pending = members.filter((member) => member.status === 'pending')

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-sm font-bold"><UsersRound className="h-4 w-4 text-amber-500" />Shared goal</h2><p className="mt-0.5 text-xs text-slate-500">Accepted members can add their own check-ins. The owner keeps editing control.</p></div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold dark:bg-slate-800">{accepted.length + 1} member{accepted.length === 0 ? '' : 's'}</span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-950/60"><span className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 dark:bg-slate-50 text-xs font-bold text-white dark:text-slate-900">YOU</span><div className="min-w-0 flex-1"><p className="text-xs font-bold">Goal owner</p><p className="text-[11px] text-slate-500">Manages the goal and team</p></div><Check className="h-4 w-4 text-emerald-500" /></div>
        {members.map((member) => {
          const name = member.profile?.full_name || member.profile?.username || 'GoalYaar member'
          return <div key={member.user_id} className="flex items-center gap-2 rounded-xl border border-slate-100 p-2 dark:border-slate-800"><ProfileAvatar value={member.profile?.avatar_url} name={name} size={32} className="rounded-full" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{name}{member.user_id === currentUserId ? ' · You' : ''}</p><p className={`text-[11px] font-bold ${member.status === 'accepted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{member.status === 'accepted' ? 'Collaborator' : 'Invitation pending'}</p></div>{(isOwner || member.user_id === currentUserId) && <button type="button" onClick={() => void remove(member)} disabled={busyId === member.user_id} aria-label={member.user_id === currentUserId ? 'Leave shared goal' : `Remove ${name}`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 dark:hover:bg-rose-950/30"><X className="h-3.5 w-3.5" /></button>}</div>
        })}
        {!loading && accepted.length === 0 && pending.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500 dark:border-slate-700">This is currently a solo goal.</p>}
      </div>

      {isOwner && <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800"><label htmlFor="collaborator-search" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Invite a collaborator</label><div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-700"><Search className="h-4 w-4 text-slate-400" /><input id="collaborator-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or username" className="min-w-0 flex-1 bg-transparent py-2.5 text-xs outline-none" /></div>{query.trim().length >= 2 && <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">{searching ? <p className="p-3 text-center text-xs text-slate-500">Searching…</p> : results.length ? results.map((profile) => { const name = profile.full_name || profile.username || 'GoalYaar member'; return <button type="button" key={profile.id} onClick={() => void invite(profile)} disabled={busyId === profile.id} className="flex w-full items-center gap-2 border-b border-slate-100 p-2.5 text-left last:border-0 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:hover:bg-slate-800"><ProfileAvatar value={profile.avatar_url} name={name} size={32} className="rounded-full" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{name}</span><span className="block truncate text-[11px] text-slate-500">{profile.username ? `@${profile.username}` : 'GoalYaar member'}</span></span><UserPlus className="h-4 w-4 text-amber-500" /></button> }) : <p className="p-3 text-center text-xs text-slate-500">No available people found.</p>}</div>}</div>}
      {message && <p role="status" className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300">{message}</p>}
    </section>
  )
}
