'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, Plus, Trophy, X } from 'lucide-react'
import { supabase } from '@/utils/supabase'

interface CircleOption { id: string; name: string }
interface Challenge { id: string; circle_id: string; creator_id: string; title: string; description: string | null; target_count: number; starts_on: string; ends_on: string }
interface Membership { challenge_id: string; user_id: string; progress_count: number }

export default function CircleChallenges({ circles, userId }: { circles: CircleOption[]; userId: string }) {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [circleId, setCircleId] = useState(circles[0]?.id || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetCount, setTargetCount] = useState(7)
  const [days, setDays] = useState(7)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!circles.length) return
    void Promise.all([
      supabase.from('circle_challenges').select('id,circle_id,creator_id,title,description,target_count,starts_on,ends_on').in('circle_id', circles.map((circle) => circle.id)).gte('ends_on', new Date().toISOString().slice(0, 10)).order('ends_on'),
      supabase.from('challenge_memberships').select('challenge_id,user_id,progress_count'),
    ]).then(([challengeResult, membershipResult]) => {
      if (!challengeResult.error) setChallenges((challengeResult.data || []) as Challenge[])
      if (!membershipResult.error) setMemberships((membershipResult.data || []) as Membership[])
    })
  }, [circles])

  const membershipMap = useMemo(() => new Map(memberships.filter((membership) => membership.user_id === userId).map((membership) => [membership.challenge_id, membership])), [memberships, userId])

  const joinChallenge = async (challenge: Challenge) => {
    setBusyId(challenge.id); setMessage(null)
    const { data, error } = await supabase.from('challenge_memberships').insert({ challenge_id: challenge.id, user_id: userId }).select('challenge_id,user_id,progress_count').single()
    if (error || !data) setMessage('Could not join this challenge.')
    else setMemberships((current) => [...current, data as Membership])
    setBusyId(null)
  }

  const addProgress = async (challenge: Challenge) => {
    const membership = membershipMap.get(challenge.id)
    if (!membership || membership.progress_count >= challenge.target_count) return
    const nextCount = membership.progress_count + 1
    setBusyId(challenge.id)
    const { error } = await supabase.from('challenge_memberships').update({ progress_count: nextCount }).eq('challenge_id', challenge.id).eq('user_id', userId)
    if (error) setMessage('Challenge progress could not be saved.')
    else setMemberships((current) => current.map((item) => item.challenge_id === challenge.id && item.user_id === userId ? { ...item, progress_count: nextCount } : item))
    setBusyId(null)
  }

  const createChallenge = async (event: React.FormEvent) => {
    event.preventDefault(); if (!circleId || title.trim().length < 3) return
    setBusyId('create'); setMessage(null)
    const start = new Date(); const end = new Date(start); end.setDate(start.getDate() + Math.max(1, days) - 1)
    const { data, error } = await supabase.from('circle_challenges').insert({ circle_id: circleId, creator_id: userId, title: title.trim(), description: description.trim() || null, target_count: targetCount, starts_on: start.toISOString().slice(0, 10), ends_on: end.toISOString().slice(0, 10) }).select('id,circle_id,creator_id,title,description,target_count,starts_on,ends_on').single()
    if (error || !data) setMessage('Challenge could not be created.')
    else {
      const challenge = data as Challenge
      setChallenges((current) => [challenge, ...current])
      await joinChallenge(challenge)
      setTitle(''); setDescription(''); setShowCreate(false)
    }
    setBusyId(null)
  }

  if (!circles.length) return null

  return <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-[#101B2D]">
    <div className="flex items-center justify-between"><div><h2 className="flex items-center gap-1.5 text-sm font-bold"><Trophy className="h-4 w-4 text-amber-500" />Circle challenges</h2><p className="text-xs text-slate-500">Small targets completed together</p></div><button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300"><Plus className="h-3.5 w-3.5" />New</button></div>
    {message && <p className="mt-3 rounded-xl bg-amber-500/10 p-2 text-xs font-semibold text-amber-700 dark:text-amber-300">{message}</p>}
    <div className="mt-3 space-y-2">{challenges.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700">Start the first shared challenge.</p> : challenges.slice(0, 4).map((challenge) => { const membership = membershipMap.get(challenge.id); const progress = membership?.progress_count || 0; const complete = progress >= challenge.target_count; return <article key={challenge.id} className="rounded-2xl bg-slate-50 p-3 dark:bg-[#07101F]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xs font-bold">{challenge.title}</h3><p className="mt-0.5 text-[11px] text-slate-500">{circles.find((circle) => circle.id === challenge.circle_id)?.name} · ends {new Date(`${challenge.ends_on}T00:00:00`).toLocaleDateString()}</p></div><span className="shrink-0 text-xs font-bold text-amber-600 dark:text-amber-400">{progress}/{challenge.target_count}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><span className="block h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, (progress / challenge.target_count) * 100)}%` }} /></div>{membership ? <button onClick={() => void addProgress(challenge)} disabled={busyId === challenge.id || complete} className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-bold disabled:text-emerald-600 dark:border-slate-700">{complete ? <><Check className="h-3 w-3" />Completed</> : 'Add one check-in'}</button> : <button onClick={() => void joinChallenge(challenge)} disabled={busyId === challenge.id} className="mt-2 w-full rounded-lg bg-slate-900 dark:bg-slate-50 py-1.5 text-xs font-bold text-white dark:text-slate-900">Join challenge</button>}</article> })}</div>
    {showCreate && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-3xl bg-white p-5 dark:bg-[#101B2D]"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">New circle challenge</h2><button onClick={() => setShowCreate(false)} aria-label="Close"><X className="h-5 w-5" /></button></div><form onSubmit={createChallenge} className="space-y-3"><label className="block text-xs font-bold uppercase text-slate-500">Circle<select value={circleId} onChange={(event) => setCircleId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm normal-case dark:border-slate-700 dark:bg-[#07101F]">{circles.map((circle) => <option key={circle.id} value={circle.id}>{circle.name}</option>)}</select></label><label className="block text-xs font-bold uppercase text-slate-500">Challenge<input required minLength={3} maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Read for 20 minutes" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm normal-case dark:border-slate-700 dark:bg-[#07101F]" /></label><label className="block text-xs font-bold uppercase text-slate-500">Description<textarea rows={2} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case dark:border-slate-700 dark:bg-[#07101F]" /></label><div className="grid grid-cols-2 gap-2"><label className="block text-xs font-bold uppercase text-slate-500">Target<input type="number" min="1" max="365" value={targetCount} onChange={(event) => setTargetCount(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-[#07101F]" /></label><label className="block text-xs font-bold uppercase text-slate-500"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />Days</span><input type="number" min="1" max="365" value={days} onChange={(event) => setDays(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-[#07101F]" /></label></div><button disabled={busyId === 'create'} className="w-full rounded-xl bg-slate-900 dark:bg-slate-50 py-3 text-sm font-bold text-white dark:text-slate-900">Create challenge</button></form></div></div>}
  </section>
}
