'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { localDateString } from '@/lib/exams'
import type { Foundation, MockResult, SyllabusNode, TopicState } from './types'
import type { Mistake, PrepEvent } from './insights'
import { applyLocally, looksOffline, readQueue, writeQueue, type QueuedEvent } from './offline'

const storage = () => { try { return typeof window === 'undefined' ? null : window.localStorage } catch { return null } }

export const TEMPLATE_CODE = 'upsc_cse_v1' // default exam until the student picks one
export interface ExamTemplate { id: string; code: string; name: string }

interface NodeRow { id: string; parent_id: string | null; kind: SyllabusNode['kind']; code: string | null; title: string; stages: string[]; papers: string[]; weight: number; pyq_frequency: number | null; sort: number; owner_id: string | null }
interface StateRow { node_id: string; touched_on: string | null; foundation: Foundation | null; revision_count: number; last_revised_on: string | null; interval_days: number | null; next_revision_on: string | null; pyq_attempted: number; pyq_correct: number; answers_written: number }
export interface MockRow extends MockResult { id: string; name: string; correct: number | null; incorrect: number | null; unattempted: number | null; totalQuestions: number | null; sections: { name: string; score: number | null; max: number | null }[] }
export interface AnswerRow { paper: string | null; count: number; timed: boolean; mentorReviewed: boolean; writtenOn: string; nodeId: string | null }
export interface PrepProfile {
  examDate: string | null; dailyMinutes: number | null
  targetStage: 'prelims' | 'mains'; planStartOn: string | null; revisionBufferPct: number
  reminderEnabled: boolean; reminderHour: number
  optionalSubjectId: string | null
  saved: boolean // false until the student has finished setup once
}
const EMPTY_PROFILE: PrepProfile = { examDate: null, dailyMinutes: null, targetStage: 'prelims', planStartOn: null, revisionBufferPct: 15, reminderEnabled: true, reminderHour: 7, optionalSubjectId: null, saved: false }
const PROFILE_COLS = 'template_id,exam_date,daily_minutes,target_stage,plan_start_on,revision_buffer_pct,reminder_enabled,reminder_hour,optional_subject_node_id'

export const NODE_COLS = 'id,parent_id,kind,code,title,stages,papers,weight,pyq_frequency,sort,owner_id'
export const STATE_COLS = 'node_id,touched_on,foundation,revision_count,last_revised_on,interval_days,next_revision_on,pyq_attempted,pyq_correct,answers_written'

export const toNode = (r: NodeRow): SyllabusNode => ({ id: r.id, parentId: r.parent_id, kind: r.kind, code: r.code, title: r.title, stages: r.stages as SyllabusNode['stages'], papers: r.papers, weight: Number(r.weight), pyqFrequency: r.pyq_frequency, sort: r.sort, ownerId: r.owner_id })
export const toState = (r: StateRow): TopicState => ({ nodeId: r.node_id, touchedOn: r.touched_on, foundation: r.foundation ?? {}, revisionCount: r.revision_count, lastRevisedOn: r.last_revised_on, intervalDays: r.interval_days, nextRevisionOn: r.next_revision_on, pyqAttempted: r.pyq_attempted, pyqCorrect: r.pyq_correct, answersWritten: r.answers_written })

export type LogKind = 'studied' | 'revised' | 'foundation' | 'pyq' | 'answers' | 'notes' | 'current_affairs' | 'mock'

/** Everything the tracker screens need, loaded once, plus write helpers that refresh the affected topic. */
export function usePrepData(enabled = true) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading')
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [nodes, setNodes] = useState<SyllabusNode[]>([])
  const [states, setStates] = useState<Map<string, TopicState>>(new Map())
  const [mocks, setMocks] = useState<MockRow[]>([])
  const [answers, setAnswers] = useState<AnswerRow[]>([])
  const [profile, setProfile] = useState<PrepProfile>(EMPTY_PROFILE)
  const [templates, setTemplates] = useState<ExamTemplate[]>([])
  const [studyDays, setStudyDays] = useState<string[]>([])
  const [events, setEvents] = useState<PrepEvent[]>([])
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const touchedRef = useRef<Set<string>>(new Set()) // topics already started, kept current between rapid ticks
  useEffect(() => { for (const s of states.values()) if (s.touchedOn) touchedRef.current.add(s.nodeId) }, [states])

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setStatus('denied'); return }
    setUserId(session.user.id)
    const { data: allowed } = await supabase.rpc('has_feature', { feature: 'prep' })
    if (allowed !== true) { setStatus('denied'); return }
    const [{ data: all }, { data: prof }] = await Promise.all([
      supabase.from('prep_exam_templates').select('id,code,name').order('name'),
      supabase.from('prep_profiles').select(PROFILE_COLS).maybeSingle(),
    ])
    const list = (all ?? []) as ExamTemplate[]
    const template = list.find((t) => t.id === prof?.template_id) ?? list.find((t) => t.code === TEMPLATE_CODE)
    if (!template) { setStatus('error'); return }
    const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10)
    const [n, s, m, a, e, mk] = await Promise.all([
      supabase.from('prep_syllabus_nodes').select(NODE_COLS).eq('template_id', template.id),
      supabase.from('prep_topic_state').select(STATE_COLS),
      supabase.from('prep_mock_tests').select('*').order('taken_on', { ascending: false }).limit(60),
      supabase.from('prep_answer_logs').select('paper,count,timed,mentor_reviewed,written_on,node_id').order('written_on', { ascending: false }).limit(500),
      supabase.from('prep_events').select('occurred_on,kind,node_id,quantity,details').gte('occurred_on', since).order('occurred_on', { ascending: false }).limit(3000),
      supabase.from('prep_mistakes').select('id,node_id,category,note,created_at,resolved_on').order('created_at', { ascending: false }).limit(500),
    ])
    if (n.error || s.error) { setStatus('error'); return }
    setTemplateId(template.id)
    setTemplates(list)
    const evs = ((e.data ?? []) as { occurred_on: string; kind: string; node_id: string | null; quantity: number; details: Record<string, unknown> | null }[])
      .map((r) => ({ occurredOn: r.occurred_on, kind: r.kind, nodeId: r.node_id, quantity: r.quantity, undo: r.details?.undo === true, habit: typeof r.details?.habit === 'string' ? r.details.habit : null }))
    setEvents(evs)
    setStudyDays([...new Set(evs.map((r) => r.occurredOn))])
    // Older databases may not have resolved_on yet; the notebook then simply starts empty.
    setMistakes(mk.error ? [] : ((mk.data ?? []) as { id: string; node_id: string | null; category: string; note: string | null; created_at: string; resolved_on: string | null }[])
      .map((r) => ({ id: r.id, nodeId: r.node_id, category: r.category, note: r.note, createdOn: r.created_at.slice(0, 10), resolvedOn: r.resolved_on })))
    setNodes(((n.data ?? []) as NodeRow[]).map(toNode))
    setStates(new Map(((s.data ?? []) as StateRow[]).map((r) => [r.node_id, toState(r)])))
    setMocks(((m.data ?? []) as { id: string; stage: MockRow['stage']; name: string; taken_on: string; score: number | null; max_score: number | null; correct: number | null; incorrect: number | null; unattempted: number | null; total_questions: number | null; sections?: { name: string; score: number | null; max: number | null }[] | null }[])
      .map((r) => ({ id: r.id, stage: r.stage, name: r.name, takenOn: r.taken_on, score: r.score === null ? null : Number(r.score), maxScore: r.max_score === null ? null : Number(r.max_score), correct: r.correct, incorrect: r.incorrect, unattempted: r.unattempted, totalQuestions: r.total_questions, sections: Array.isArray(r.sections) ? r.sections : [] })))
    setAnswers(((a.data ?? []) as { paper: string | null; count: number; timed: boolean; mentor_reviewed: boolean; written_on: string; node_id: string | null }[])
      .map((r) => ({ paper: r.paper, count: r.count, timed: r.timed, mentorReviewed: r.mentor_reviewed, writtenOn: r.written_on, nodeId: r.node_id })))
    setProfile(prof ? { examDate: prof.exam_date, dailyMinutes: prof.daily_minutes, targetStage: prof.target_stage === 'mains' ? 'mains' : 'prelims', planStartOn: prof.plan_start_on, revisionBufferPct: prof.revision_buffer_pct ?? 15, reminderEnabled: prof.reminder_enabled ?? true, reminderHour: prof.reminder_hour ?? 7, optionalSubjectId: prof.optional_subject_node_id ?? null, saved: true } : EMPTY_PROFILE)
    setStatus('ready')
  }, [])

  useEffect(() => {
    if (!enabled) return
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [enabled, load])

  const refreshTopic = useCallback(async (nodeId: string) => {
    const { data } = await supabase.from('prep_topic_state').select(STATE_COLS).eq('node_id', nodeId).maybeSingle()
    setStates((cur) => { const next = new Map(cur); if (data) next.set(nodeId, toState(data as StateRow)); return next })
  }, [])

  /** Append one evidence event (the ledger) and refresh that topic. */
  const [pending, setPending] = useState(0) // events saved on this device, waiting for the network
  const kindOf = useRef(new Map<string, string>())
  useEffect(() => { kindOf.current = new Map(nodes.map((n) => [n.id, n.kind])) }, [nodes])

  const logEvent = useCallback(async (nodeId: string | null, kind: LogKind, opts: { quantity?: number; details?: Record<string, unknown>; minutes?: number } = {}) => {
    const day = localDateString()
    const row = { node_id: nodeId, kind, quantity: opts.quantity ?? 1, details: opts.details ?? {}, minutes: opts.minutes ?? null, occurred_on: day }
    const { error } = await supabase.from('prep_events').insert(row)
    const offline = Boolean(error) && looksOffline(error?.message, typeof navigator === 'undefined' ? true : navigator.onLine)
    if (error && !offline) return false
    setStudyDays((cur) => (cur.includes(day) ? cur : [day, ...cur]))
    setEvents((cur) => [{ occurredOn: day, kind, nodeId, quantity: row.quantity, undo: row.details.undo === true, habit: typeof row.details.habit === 'string' ? row.details.habit : null }, ...cur])
    if (offline) {
      const q = readQueue(storage())
      q.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...row })
      writeQueue(storage(), q)
      setPending(q.length)
      if (nodeId) setStates((cur) => { const next = new Map(cur); const s = applyLocally(cur.get(nodeId), nodeId, row, kindOf.current.get(nodeId) === 'subtopic'); if (s) next.set(nodeId, s); return next })
      return true
    }
    if (nodeId) await refreshTopic(nodeId)
    return true
  }, [refreshTopic])

  /** Send anything saved while offline, oldest first, then reload from the server. */
  const flushQueue = useCallback(async () => {
    const q = readQueue(storage())
    setPending(q.length)
    if (!q.length) return
    const { error } = await supabase.from('prep_events').insert(q.map(({ id: _id, ...e }: QueuedEvent) => e))
    if (error) return
    writeQueue(storage(), [])
    setPending(0)
    const { data } = await supabase.from('prep_topic_state').select(STATE_COLS)
    if (data) setStates(new Map((data as StateRow[]).map((r) => [r.node_id, toState(r)])))
  }, [])
  useEffect(() => {
    if (status !== 'ready') return
    const t = window.setTimeout(() => void flushQueue(), 0)
    const on = () => void flushQueue()
    window.addEventListener('online', on)
    return () => { window.clearTimeout(t); window.removeEventListener('online', on) }
  }, [status, flushQueue])

  /**
   * Tick or untick one study unit (an official subtopic, or a topic without subtopics).
   * Ticking a subtopic also marks its topic as started, which starts that topic's revision schedule.
   */
  const tick = useCallback(async (nodeId: string, on: boolean) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return false
    if (!on) return logEvent(nodeId, 'studied', { details: { undo: true } })
    const ok = await logEvent(nodeId, 'studied')
    const parent = node.kind === 'subtopic' && node.parentId ? node.parentId : null
    if (ok && parent && !touchedRef.current.has(parent)) { touchedRef.current.add(parent); await logEvent(parent, 'studied') }
    return ok
  }, [nodes, logEvent])

  /** Saves plan settings. Switching exam reloads the syllabus; ticks on the old exam are kept. */
  const saveProfile = useCallback(async (next: Partial<PrepProfile> & { templateId?: string }) => {
    if (!templateId || !userId) return false
    const merged = { ...profile, ...next }
    const target = next.templateId ?? templateId
    const { error } = await supabase.from('prep_profiles').upsert({
      user_id: userId, template_id: target, exam_date: merged.examDate, daily_minutes: merged.dailyMinutes,
      target_stage: merged.targetStage, plan_start_on: merged.planStartOn, revision_buffer_pct: merged.revisionBufferPct,
      reminder_enabled: merged.reminderEnabled, reminder_hour: merged.reminderHour, optional_subject_node_id: next.templateId && next.templateId !== templateId ? null : merged.optionalSubjectId, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (error) return false
    setProfile({ ...merged, optionalSubjectId: next.templateId && next.templateId !== templateId ? null : merged.optionalSubjectId, saved: true })
    if (target !== templateId) { setStatus('loading'); await load() }
    return true
  }, [templateId, userId, profile, load])

  /** Mistake notebook: add one, or mark it revisited. */
  const addMistake = useCallback(async (m: { nodeId: string | null; category: string; note: string | null }) => {
    const { data, error } = await supabase.from('prep_mistakes').insert({ node_id: m.nodeId, category: m.category, note: m.note }).select('id,created_at').single()
    if (error || !data) return false
    setMistakes((cur) => [{ id: data.id, nodeId: m.nodeId, category: m.category, note: m.note, createdOn: localDateString(), resolvedOn: null }, ...cur])
    return true
  }, [])
  const resolveMistake = useCallback(async (id: string, resolved: boolean) => {
    const resolvedOn = resolved ? localDateString() : null
    const { error } = await supabase.from('prep_mistakes').update({ resolved_on: resolvedOn }).eq('id', id)
    if (!error) setMistakes((cur) => cur.map((m) => (m.id === id ? { ...m, resolvedOn } : m)))
    return !error
  }, [])

  /** Remembers today's target so the reminder can quote it. Fire-and-forget. */
  const saveTarget = useCallback(async (dailyTarget: number) => {
    if (!userId || !profile.saved) return
    await supabase.from('prep_profiles').update({ daily_target: Math.min(500, Math.max(0, dailyTarget)), target_computed_on: localDateString() }).eq('user_id', userId)
  }, [userId, profile.saved])

  return { status, pending, templateId, templates, template: templates.find((t) => t.id === templateId) ?? null, studyDays, events, mistakes, addMistake, resolveMistake, saveTarget, tick, nodes, setNodes, states, mocks, answers, profile, userId, reload: load, refreshTopic, logEvent, saveProfile }
}
