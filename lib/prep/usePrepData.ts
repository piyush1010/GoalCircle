'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { localDateString } from '@/lib/exams'
import type { Foundation, MockResult, SyllabusNode, TopicState } from './types'
import type { Mistake, PrepEvent } from './insights'
import { announcePrepActive } from './active'
import { applyLocally, looksOffline, readQueue, writeQueue, type QueuedEvent } from './offline'

const storage = () => { try { return typeof window === 'undefined' ? null : window.localStorage } catch { return null } }

export const TEMPLATE_CODE = 'upsc_cse_v1' // default exam until the student picks one
export interface ExamTemplate { id: string; code: string; name: string }

interface NodeRow { template_id?: string; id: string; parent_id: string | null; kind: SyllabusNode['kind']; code: string | null; title: string; stages: string[]; papers: string[]; weight: number; pyq_frequency: number | null; sort: number; owner_id: string | null }
interface StateRow { node_id: string; touched_on: string | null; foundation: Foundation | null; revision_count: number; last_revised_on: string | null; interval_days: number | null; next_revision_on: string | null; pyq_attempted: number; pyq_correct: number; answers_written: number }
export interface MockRow extends MockResult { id: string; name: string; correct: number | null; incorrect: number | null; unattempted: number | null; totalQuestions: number | null; sections: { name: string; score: number | null; max: number | null }[] }
export interface AnswerRow { paper: string | null; count: number; timed: boolean; mentorReviewed: boolean; writtenOn: string; nodeId: string | null }
export interface PrepProfile {
  examDate: string | null; dailyMinutes: number | null
  targetStage: 'prelims' | 'mains'; planStartOn: string | null; revisionBufferPct: number
  reminderEnabled: boolean; reminderHour: number
  optionalSubjectId: string | null
  active: boolean // false = paused; Today shows goals only
  level: 'beginner' | 'intermediate' | 'advanced' | null
  saved: boolean // false until the student has finished setup once
}
const EMPTY_PROFILE: PrepProfile = { examDate: null, dailyMinutes: null, targetStage: 'prelims', planStartOn: null, revisionBufferPct: 15, reminderEnabled: true, reminderHour: 7, optionalSubjectId: null, active: false, level: null, saved: false }
/** One exam the student is preparing for. */
export interface PrepPlan {
  templateId: string; code: string; name: string
  examDate: string | null; targetStage: 'prelims' | 'mains'; planStartOn: string | null; revisionBufferPct: number
  level: PrepProfile['level']; optionalSubjectId: string | null; active: boolean
}
interface PlanRow { template_id: string; exam_date: string | null; target_stage: string | null; plan_start_on: string | null; revision_buffer_pct: number | null; level: PrepProfile['level']; optional_subject_node_id: string | null; active: boolean | null }
const PLAN_COLS = 'template_id,exam_date,target_stage,plan_start_on,revision_buffer_pct,level,optional_subject_node_id,active'
const VIEW_KEY = 'goalyaar-prep-view'
const readView = () => { try { return window.localStorage.getItem(VIEW_KEY) } catch { return null } }

/** Supabase returns at most 1000 rows per request; read a big syllabus in pages. */
async function allNodes(templateIds: string[]): Promise<{ rows: NodeRow[]; error: boolean }> {
  const rows: NodeRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('prep_syllabus_nodes').select(`${NODE_COLS},template_id`).in('template_id', templateIds).order('id').range(from, from + 999)
    if (error) return { rows, error: true }
    rows.push(...((data ?? []) as NodeRow[]))
    if (!data || data.length < 1000) return { rows, error: false }
  }
}

const PROFILE_COLS = 'template_id,exam_date,daily_minutes,target_stage,plan_start_on,revision_buffer_pct,reminder_enabled,reminder_hour,optional_subject_node_id,active,level'

export const NODE_COLS = 'id,parent_id,kind,code,title,stages,papers,weight,pyq_frequency,sort,owner_id'
export const STATE_COLS = 'node_id,touched_on,foundation,revision_count,last_revised_on,interval_days,next_revision_on,pyq_attempted,pyq_correct,answers_written'

export const toNode = (r: NodeRow): SyllabusNode => ({ id: r.id, parentId: r.parent_id, kind: r.kind, code: r.code, title: r.title, stages: r.stages as SyllabusNode['stages'], papers: r.papers, weight: Number(r.weight), pyqFrequency: r.pyq_frequency, sort: r.sort, ownerId: r.owner_id })
export const toState = (r: StateRow): TopicState => ({ nodeId: r.node_id, touchedOn: r.touched_on, foundation: r.foundation ?? {}, revisionCount: r.revision_count, lastRevisedOn: r.last_revised_on, intervalDays: r.interval_days, nextRevisionOn: r.next_revision_on, pyqAttempted: r.pyq_attempted, pyqCorrect: r.pyq_correct, answersWritten: r.answers_written })

export type LogKind = 'studied' | 'revised' | 'foundation' | 'pyq' | 'answers' | 'notes' | 'current_affairs' | 'mock'

/** Everything the tracker screens need, loaded once, plus write helpers that refresh the affected topic. */
export function usePrepData(enabled = true) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading')
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [nodesByTemplate, setNodesByTemplate] = useState<Map<string, SyllabusNode[]>>(new Map())
  const [plans, setPlans] = useState<PrepPlan[]>([])
  const [primaryId, setPrimaryId] = useState<string | null>(null)
  const nodes = useMemo(() => (templateId ? nodesByTemplate.get(templateId) ?? [] : []), [nodesByTemplate, templateId])
  const setNodes = useCallback((fn: (cur: SyllabusNode[]) => SyllabusNode[]) => {
    setNodesByTemplate((cur) => { if (!templateId) return cur; const next = new Map(cur); next.set(templateId, fn(cur.get(templateId) ?? [])); return next })
  }, [templateId])
  const [states, setStates] = useState<Map<string, TopicState>>(new Map())
  const [mocks, setMocks] = useState<MockRow[]>([])
  const [answers, setAnswers] = useState<AnswerRow[]>([])
  const [userSettings, setUserSettings] = useState<{ dailyMinutes: number | null; reminderEnabled: boolean; reminderHour: number; active: boolean } | null>(null)
  const [templates, setTemplates] = useState<ExamTemplate[]>([])
  const [studyDays, setStudyDays] = useState<string[]>([])
  const [events, setEvents] = useState<PrepEvent[]>([])
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const touchedRef = useRef<Set<string>>(new Set()) // topics already started, kept current between rapid ticks
  useEffect(() => { for (const s of states.values()) if (s.touchedOn) touchedRef.current.add(s.nodeId) }, [states])

  // The profile the screens use: the exam being viewed, plus person-level settings.
  const viewPlan = plans.find((p) => p.templateId === templateId && p.active) ?? null
  const profile: PrepProfile = useMemo(() => (!userSettings || !viewPlan ? { ...EMPTY_PROFILE, ...(userSettings ? { dailyMinutes: userSettings.dailyMinutes, reminderEnabled: userSettings.reminderEnabled, reminderHour: userSettings.reminderHour } : {}) } : {
    examDate: viewPlan.examDate, targetStage: viewPlan.targetStage, planStartOn: viewPlan.planStartOn, revisionBufferPct: viewPlan.revisionBufferPct,
    level: viewPlan.level, optionalSubjectId: viewPlan.optionalSubjectId,
    dailyMinutes: userSettings.dailyMinutes, reminderEnabled: userSettings.reminderEnabled, reminderHour: userSettings.reminderHour, active: userSettings.active, saved: true,
  }), [userSettings, viewPlan])

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setStatus('denied'); return }
    setUserId(session.user.id)
    const { data: allowed } = await supabase.rpc('has_feature', { feature: 'prep' })
    if (allowed !== true) { setStatus('denied'); return }
    const [{ data: all }, { data: prof }, planRes] = await Promise.all([
      supabase.from('prep_exam_templates').select('id,code,name').order('name'),
      supabase.from('prep_profiles').select(PROFILE_COLS).maybeSingle(),
      supabase.from('prep_plans').select(PLAN_COLS),
    ])
    const list = (all ?? []) as ExamTemplate[]
    const byId = new Map(list.map((t) => [t.id, t]))
    // Plans: one per exam. Before the multi-exam migration, the single profile acts as the only plan.
    let rows = (planRes.error ? [] : (planRes.data ?? []) as PlanRow[])
    if (!rows.length && prof) rows = [{ template_id: prof.template_id, exam_date: prof.exam_date, target_stage: prof.target_stage, plan_start_on: prof.plan_start_on, revision_buffer_pct: prof.revision_buffer_pct, level: prof.level ?? null, optional_subject_node_id: prof.optional_subject_node_id, active: true }]
    const planList: PrepPlan[] = rows.filter((r) => byId.has(r.template_id)).map((r) => ({
      templateId: r.template_id, code: byId.get(r.template_id)!.code, name: byId.get(r.template_id)!.name,
      examDate: r.exam_date, targetStage: r.target_stage === 'mains' ? 'mains' : 'prelims', planStartOn: r.plan_start_on, revisionBufferPct: r.revision_buffer_pct ?? 15,
      level: r.level ?? null, optionalSubjectId: r.optional_subject_node_id, active: r.active !== false,
    })).sort((a, b) => (a.examDate ?? '9999').localeCompare(b.examDate ?? '9999'))
    const activePlans = planList.filter((p) => p.active)
    const fallback = list.find((t) => t.code === TEMPLATE_CODE)
    const remembered = readView()
    const view = activePlans.find((p) => p.templateId === remembered)?.templateId ?? activePlans.find((p) => p.templateId === prof?.template_id)?.templateId ?? activePlans[0]?.templateId ?? fallback?.id
    if (!view) { setStatus('error'); return }
    const toLoad = [...new Set([view, ...activePlans.map((p) => p.templateId)])]
    const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10)
    const [n, s, m, a, e, mk] = await Promise.all([
      allNodes(toLoad),
      supabase.from('prep_topic_state').select(STATE_COLS),
      supabase.from('prep_mock_tests').select('*').order('taken_on', { ascending: false }).limit(60),
      supabase.from('prep_answer_logs').select('paper,count,timed,mentor_reviewed,written_on,node_id').order('written_on', { ascending: false }).limit(500),
      supabase.from('prep_events').select('occurred_on,kind,node_id,quantity,details,minutes').gte('occurred_on', since).order('occurred_on', { ascending: false }).limit(3000),
      supabase.from('prep_mistakes').select('id,node_id,category,note,created_at,resolved_on').order('created_at', { ascending: false }).limit(500),
    ])
    if (n.error || s.error) { setStatus('error'); return }
    setTemplateId(view)
    setTemplates(list)
    setPlans(planList)
    setPrimaryId(prof?.template_id ?? null)
    const grouped = new Map<string, SyllabusNode[]>()
    for (const r of n.rows) { const t = r.template_id ?? view; if (!grouped.has(t)) grouped.set(t, []); grouped.get(t)!.push(toNode(r)) }
    setNodesByTemplate(grouped)
    const evs = ((e.data ?? []) as { occurred_on: string; kind: string; node_id: string | null; quantity: number; details: Record<string, unknown> | null; minutes: number | null }[])
      .map((r) => ({ occurredOn: r.occurred_on, kind: r.kind, nodeId: r.node_id, quantity: r.quantity, undo: r.details?.undo === true, habit: typeof r.details?.habit === 'string' ? r.details.habit : null, minutes: r.minutes }))
    setEvents(evs)
    setStudyDays([...new Set(evs.map((r) => r.occurredOn))])
    // Older databases may not have resolved_on yet; the notebook then simply starts empty.
    setMistakes(mk.error ? [] : ((mk.data ?? []) as { id: string; node_id: string | null; category: string; note: string | null; created_at: string; resolved_on: string | null }[])
      .map((r) => ({ id: r.id, nodeId: r.node_id, category: r.category, note: r.note, createdOn: r.created_at.slice(0, 10), resolvedOn: r.resolved_on })))
    setStates(new Map(((s.data ?? []) as StateRow[]).map((r) => [r.node_id, toState(r)])))
    setMocks(((m.data ?? []) as { id: string; stage: MockRow['stage']; name: string; taken_on: string; score: number | null; max_score: number | null; correct: number | null; incorrect: number | null; unattempted: number | null; total_questions: number | null; sections?: { name: string; score: number | null; max: number | null }[] | null }[])
      .map((r) => ({ id: r.id, stage: r.stage, name: r.name, takenOn: r.taken_on, score: r.score === null ? null : Number(r.score), maxScore: r.max_score === null ? null : Number(r.max_score), correct: r.correct, incorrect: r.incorrect, unattempted: r.unattempted, totalQuestions: r.total_questions, sections: Array.isArray(r.sections) ? r.sections : [] })))
    setAnswers(((a.data ?? []) as { paper: string | null; count: number; timed: boolean; mentor_reviewed: boolean; written_on: string; node_id: string | null }[])
      .map((r) => ({ paper: r.paper, count: r.count, timed: r.timed, mentorReviewed: r.mentor_reviewed, writtenOn: r.written_on, nodeId: r.node_id })))
    setUserSettings(prof ? { dailyMinutes: prof.daily_minutes, reminderEnabled: prof.reminder_enabled ?? true, reminderHour: prof.reminder_hour ?? 7, active: prof.active !== false } : null)
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
  useEffect(() => { kindOf.current = new Map([...nodesByTemplate.values()].flat().map((n) => [n.id, n.kind])) }, [nodesByTemplate])

  const logEvent = useCallback(async (nodeId: string | null, kind: LogKind, opts: { quantity?: number; details?: Record<string, unknown>; minutes?: number } = {}) => {
    const day = localDateString()
    const row = { node_id: nodeId, kind, quantity: opts.quantity ?? 1, details: opts.details ?? {}, minutes: opts.minutes ?? null, occurred_on: day }
    const { error } = await supabase.from('prep_events').insert(row)
    const offline = Boolean(error) && looksOffline(error?.message, typeof navigator === 'undefined' ? true : navigator.onLine)
    if (error && !offline) return false
    setStudyDays((cur) => (cur.includes(day) ? cur : [day, ...cur]))
    setEvents((cur) => [{ occurredOn: day, kind, nodeId, quantity: row.quantity, undo: row.details.undo === true, habit: typeof row.details.habit === 'string' ? row.details.habit : null, minutes: row.minutes }, ...cur])
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
  // The same official unit in two exams (UPSC and UPPCS share Polity, for example) has the same code.
  const allNodeList = useMemo(() => [...nodesByTemplate.values()].flat(), [nodesByTemplate])
  const twinsOf = useMemo(() => {
    const byCode = new Map<string, string[]>()
    for (const n of allNodeList) if (n.code && !n.ownerId && (n.kind === 'subtopic' || n.kind === 'topic')) byCode.set(n.code, [...(byCode.get(n.code) ?? []), n.id])
    const out = new Map<string, string[]>()
    for (const n of allNodeList) if (n.code && (byCode.get(n.code)?.length ?? 0) > 1) out.set(n.id, byCode.get(n.code)!.filter((id) => id !== n.id))
    return out
  }, [allNodeList])
  const nodeById = useMemo(() => new Map(allNodeList.map((n) => [n.id, n])), [allNodeList])

  const tick = useCallback(async (nodeId: string, on: boolean, minutes?: number) => {
    const node = nodeById.get(nodeId)
    if (!node) return false
    const twins = (twinsOf.get(nodeId) ?? []).filter((id) => Boolean(states.get(id)?.touchedOn) !== on)
    if (!on) {
      const ok = await logEvent(nodeId, 'studied', { details: { undo: true } })
      for (const id of twins) await logEvent(id, 'studied', { details: { undo: true, twin: true } })
      return ok
    }
    const ok = await logEvent(nodeId, 'studied', minutes ? { minutes: Math.min(960, Math.round(minutes)) } : {})
    for (const id of [nodeId, ...twins]) {
      if (id !== nodeId && ok) await logEvent(id, 'studied', { details: { twin: true } })
      const n = nodeById.get(id)
      const parent = n?.kind === 'subtopic' && n.parentId ? n.parentId : null
      if (ok && parent && !touchedRef.current.has(parent)) { touchedRef.current.add(parent); await logEvent(parent, 'studied') }
    }
    return ok
  }, [nodeById, twinsOf, states, logEvent])

  /**
   * Tick many study units at once ("I have already finished these subjects"). One insert for all the
   * subtopics plus their topics that were not started yet, then one reload, so it stays fast.
   */
  const tickMany = useCallback(async (picked: string[]) => {
    const ids = [...new Set([...picked, ...picked.flatMap((id) => (twinsOf.get(id) ?? []).filter((t) => !states.get(t)?.touchedOn))])]
    const parentOf = new Map(allNodeList.map((n) => [n.id, n.kind === 'subtopic' ? n.parentId : null]))
    const day = localDateString()
    const parents = [...new Set(ids.map((id) => parentOf.get(id)).filter((p): p is string => Boolean(p) && !touchedRef.current.has(p as string)))]
    const rows = [...ids, ...parents].map((id) => ({ node_id: id, kind: 'studied', quantity: 1, details: { bulk: true }, minutes: null, occurred_on: day }))
    for (let i = 0; i < rows.length; i += 400) {
      const { error } = await supabase.from('prep_events').insert(rows.slice(i, i + 400))
      if (error) return false
    }
    parents.forEach((p) => touchedRef.current.add(p))
    const { data } = await supabase.from('prep_topic_state').select(STATE_COLS)
    if (data) setStates(new Map((data as StateRow[]).map((r) => [r.node_id, toState(r)])))
    setStudyDays((cur) => (cur.includes(day) ? cur : [day, ...cur]))
    return true
  }, [allNodeList, twinsOf, states])

  /**
   * Saves settings. Exam fields (date, stage, level, optional) go to that exam's plan; hours, reminders and
   * the on/off switch are for the person. Passing a templateId that is not a plan yet adds that exam.
   */
  const saveProfile = useCallback(async (next: Partial<PrepProfile> & { templateId?: string }) => {
    if (!templateId || !userId) return false
    const target = next.templateId ?? templateId
    const base = plans.find((p) => p.templateId === target)
    const plan = {
      examDate: next.examDate !== undefined ? next.examDate : base?.examDate ?? null,
      targetStage: next.targetStage ?? base?.targetStage ?? 'prelims',
      planStartOn: next.planStartOn !== undefined ? next.planStartOn : base?.planStartOn ?? null,
      revisionBufferPct: next.revisionBufferPct ?? base?.revisionBufferPct ?? 15,
      level: next.level !== undefined ? next.level : base?.level ?? null,
      optionalSubjectId: next.optionalSubjectId !== undefined ? next.optionalSubjectId : base?.optionalSubjectId ?? null,
    }
    const person = {
      dailyMinutes: next.dailyMinutes !== undefined ? next.dailyMinutes : userSettings?.dailyMinutes ?? null,
      reminderEnabled: next.reminderEnabled ?? userSettings?.reminderEnabled ?? true,
      reminderHour: next.reminderHour ?? userSettings?.reminderHour ?? 7,
      active: next.active ?? (userSettings ? userSettings.active : true),
    }
    const primary = primaryId && plans.some((p) => p.templateId === primaryId && p.active) ? primaryId : target
    const legacy = primary === target ? { exam_date: plan.examDate, target_stage: plan.targetStage, plan_start_on: plan.planStartOn, revision_buffer_pct: plan.revisionBufferPct, optional_subject_node_id: plan.optionalSubjectId, level: plan.level } : {}
    const { error } = await supabase.from('prep_profiles').upsert({
      user_id: userId, template_id: primary, daily_minutes: person.dailyMinutes, reminder_enabled: person.reminderEnabled, reminder_hour: person.reminderHour, active: person.active, ...legacy, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (error) return false
    const { error: planError } = await supabase.from('prep_plans').upsert({
      user_id: userId, template_id: target, exam_date: plan.examDate, target_stage: plan.targetStage, plan_start_on: plan.planStartOn, revision_buffer_pct: plan.revisionBufferPct, level: plan.level, optional_subject_node_id: plan.optionalSubjectId, active: true, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,template_id' })
    // Before the multi-exam migration only the profile exists; that is still a working single plan.
    if (planError && primary !== target) return false
    announcePrepActive(person.active)
    setPrimaryId(primary)
    setUserSettings(person)
    const known = plans.some((p) => p.templateId === target)
    const t = templates.find((x) => x.id === target)
    setPlans((cur) => {
      const updated: PrepPlan = { templateId: target, code: t?.code ?? '', name: t?.name ?? '', ...plan, active: true }
      return (known ? cur.map((p) => (p.templateId === target ? updated : p)) : [...cur, updated]).sort((a, b) => (a.examDate ?? '9999').localeCompare(b.examDate ?? '9999'))
    })
    if (target !== templateId || !nodesByTemplate.has(target)) {
      try { window.localStorage.setItem(VIEW_KEY, target) } catch { /* view resets to the first exam */ }
      setStatus('loading'); await load()
    }
    return true
  }, [templateId, userId, plans, userSettings, primaryId, templates, nodesByTemplate, load])

  /** Look at another exam's syllabus, plan and progress (Today always shows all of them). */
  const setView = useCallback((id: string) => {
    if (!plans.some((p) => p.templateId === id)) return
    try { window.localStorage.setItem(VIEW_KEY, id) } catch { /* not remembered */ }
    setTemplateId(id)
  }, [plans])

  /** Stop preparing for one exam. Its ticks and history are kept; adding it again brings them back. */
  const removePlan = useCallback(async (id: string) => {
    if (!userId) return false
    const { error } = await supabase.from('prep_plans').update({ active: false, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('template_id', id)
    if (error) return false
    const rest = plans.filter((p) => p.active && p.templateId !== id)
    if (primaryId === id && rest[0]) await supabase.from('prep_profiles').update({ template_id: rest[0].templateId, exam_date: rest[0].examDate, target_stage: rest[0].targetStage, plan_start_on: rest[0].planStartOn }).eq('user_id', userId)
    if (!rest.length) { await supabase.from('prep_profiles').update({ active: false }).eq('user_id', userId); announcePrepActive(false) }
    setPlans((cur) => cur.map((p) => (p.templateId === id ? { ...p, active: false } : p)))
    if (rest[0]) { setPrimaryId(primaryId === id ? rest[0].templateId : primaryId); if (templateId === id) setView(rest[0].templateId) }
    return true
  }, [userId, plans, primaryId, templateId, setView])

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

  return { status, pending, templateId, templates, plans: plans.filter((p) => p.active), nodesByTemplate, setView, removePlan, template: templates.find((t) => t.id === templateId) ?? null, studyDays, events, mistakes, addMistake, resolveMistake, saveTarget, tick, tickMany, nodes, setNodes, states, mocks, answers, profile, userId, reload: load, refreshTopic, logEvent, saveProfile }
}
