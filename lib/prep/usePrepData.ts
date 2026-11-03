'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { localDateString } from '@/lib/exams'
import type { Foundation, MockResult, SyllabusNode, TopicState } from './types'

export const TEMPLATE_CODE = 'upsc_cse_v1' // default exam until the student picks one
export interface ExamTemplate { id: string; code: string; name: string }

interface NodeRow { id: string; parent_id: string | null; kind: SyllabusNode['kind']; code: string | null; title: string; stages: string[]; papers: string[]; weight: number; pyq_frequency: number | null; sort: number; owner_id: string | null }
interface StateRow { node_id: string; touched_on: string | null; foundation: Foundation | null; revision_count: number; last_revised_on: string | null; interval_days: number | null; next_revision_on: string | null; pyq_attempted: number; pyq_correct: number; answers_written: number }
export interface MockRow extends MockResult { id: string; name: string; correct: number | null; incorrect: number | null; unattempted: number | null; totalQuestions: number | null }
export interface AnswerRow { paper: string | null; count: number; timed: boolean; mentorReviewed: boolean; writtenOn: string; nodeId: string | null }
export interface PrepProfile {
  examDate: string | null; dailyMinutes: number | null
  targetStage: 'prelims' | 'mains'; planStartOn: string | null; revisionBufferPct: number
  reminderEnabled: boolean; reminderHour: number
  saved: boolean // false until the student has finished setup once
}
const EMPTY_PROFILE: PrepProfile = { examDate: null, dailyMinutes: null, targetStage: 'prelims', planStartOn: null, revisionBufferPct: 15, reminderEnabled: true, reminderHour: 7, saved: false }
const PROFILE_COLS = 'template_id,exam_date,daily_minutes,target_stage,plan_start_on,revision_buffer_pct,reminder_enabled,reminder_hour'

export const NODE_COLS = 'id,parent_id,kind,code,title,stages,papers,weight,pyq_frequency,sort,owner_id'
export const STATE_COLS = 'node_id,touched_on,foundation,revision_count,last_revised_on,interval_days,next_revision_on,pyq_attempted,pyq_correct,answers_written'

export const toNode = (r: NodeRow): SyllabusNode => ({ id: r.id, parentId: r.parent_id, kind: r.kind, code: r.code, title: r.title, stages: r.stages as SyllabusNode['stages'], papers: r.papers, weight: Number(r.weight), pyqFrequency: r.pyq_frequency, sort: r.sort, ownerId: r.owner_id })
export const toState = (r: StateRow): TopicState => ({ nodeId: r.node_id, touchedOn: r.touched_on, foundation: r.foundation ?? {}, revisionCount: r.revision_count, lastRevisedOn: r.last_revised_on, intervalDays: r.interval_days, nextRevisionOn: r.next_revision_on, pyqAttempted: r.pyq_attempted, pyqCorrect: r.pyq_correct, answersWritten: r.answers_written })

export type LogKind = 'studied' | 'revised' | 'foundation' | 'pyq' | 'answers' | 'notes'

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
    const [n, s, m, a, e] = await Promise.all([
      supabase.from('prep_syllabus_nodes').select(NODE_COLS).eq('template_id', template.id),
      supabase.from('prep_topic_state').select(STATE_COLS),
      supabase.from('prep_mock_tests').select('id,stage,name,taken_on,score,max_score,correct,incorrect,unattempted,total_questions').order('taken_on', { ascending: false }).limit(60),
      supabase.from('prep_answer_logs').select('paper,count,timed,mentor_reviewed,written_on,node_id').order('written_on', { ascending: false }).limit(500),
      supabase.from('prep_events').select('occurred_on').gte('occurred_on', since).order('occurred_on', { ascending: false }).limit(1000),
    ])
    if (n.error || s.error) { setStatus('error'); return }
    setTemplateId(template.id)
    setTemplates(list)
    setStudyDays([...new Set(((e.data ?? []) as { occurred_on: string }[]).map((r) => r.occurred_on))])
    setNodes(((n.data ?? []) as NodeRow[]).map(toNode))
    setStates(new Map(((s.data ?? []) as StateRow[]).map((r) => [r.node_id, toState(r)])))
    setMocks(((m.data ?? []) as { id: string; stage: MockRow['stage']; name: string; taken_on: string; score: number | null; max_score: number | null; correct: number | null; incorrect: number | null; unattempted: number | null; total_questions: number | null }[])
      .map((r) => ({ id: r.id, stage: r.stage, name: r.name, takenOn: r.taken_on, score: r.score === null ? null : Number(r.score), maxScore: r.max_score === null ? null : Number(r.max_score), correct: r.correct, incorrect: r.incorrect, unattempted: r.unattempted, totalQuestions: r.total_questions })))
    setAnswers(((a.data ?? []) as { paper: string | null; count: number; timed: boolean; mentor_reviewed: boolean; written_on: string; node_id: string | null }[])
      .map((r) => ({ paper: r.paper, count: r.count, timed: r.timed, mentorReviewed: r.mentor_reviewed, writtenOn: r.written_on, nodeId: r.node_id })))
    setProfile(prof ? { examDate: prof.exam_date, dailyMinutes: prof.daily_minutes, targetStage: prof.target_stage === 'mains' ? 'mains' : 'prelims', planStartOn: prof.plan_start_on, revisionBufferPct: prof.revision_buffer_pct ?? 15, reminderEnabled: prof.reminder_enabled ?? true, reminderHour: prof.reminder_hour ?? 7, saved: true } : EMPTY_PROFILE)
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
  const logEvent = useCallback(async (nodeId: string | null, kind: LogKind, opts: { quantity?: number; details?: Record<string, unknown>; minutes?: number } = {}) => {
    const { error } = await supabase.from('prep_events').insert({ node_id: nodeId, kind, quantity: opts.quantity ?? 1, details: opts.details ?? {}, minutes: opts.minutes ?? null, occurred_on: localDateString() })
    if (error) return false
    const day = localDateString()
    setStudyDays((cur) => (cur.includes(day) ? cur : [day, ...cur]))
    if (nodeId) await refreshTopic(nodeId)
    return true
  }, [refreshTopic])

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
      reminder_enabled: merged.reminderEnabled, reminder_hour: merged.reminderHour, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (error) return false
    setProfile({ ...merged, saved: true })
    if (target !== templateId) { setStatus('loading'); await load() }
    return true
  }, [templateId, userId, profile, load])

  /** Remembers today's target so the reminder can quote it. Fire-and-forget. */
  const saveTarget = useCallback(async (dailyTarget: number) => {
    if (!userId || !profile.saved) return
    await supabase.from('prep_profiles').update({ daily_target: Math.min(500, Math.max(0, dailyTarget)), target_computed_on: localDateString() }).eq('user_id', userId)
  }, [userId, profile.saved])

  return { status, templateId, templates, template: templates.find((t) => t.id === templateId) ?? null, studyDays, saveTarget, tick, nodes, setNodes, states, mocks, answers, profile, userId, reload: load, refreshTopic, logEvent, saveProfile }
}
