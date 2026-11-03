// Shared types for the preparation tracker. Pure data: no I/O.

export type Stage = 'prelims' | 'mains' | 'interview'
export type NodeKind = 'stage' | 'paper' | 'subject' | 'topic' | 'subtopic' | 'ncert_book' | 'ncert_chapter'

export interface SyllabusNode {
  id: string
  parentId: string | null
  kind: NodeKind
  code: string | null
  title: string
  stages: Stage[]
  papers: string[]
  weight: number
  pyqFrequency: number | null
  sort?: number
  ownerId?: string | null
}

export interface Foundation { read?: boolean; highlighted?: boolean; notes?: boolean; open_notes?: boolean; limited_sources?: boolean }

/** Per-topic state as stored in prep_topic_state (dates are YYYY-MM-DD). */
export interface TopicState {
  nodeId: string
  touchedOn: string | null
  foundation: Foundation
  revisionCount: number
  lastRevisedOn: string | null
  intervalDays: number | null
  nextRevisionOn: string | null
  pyqAttempted: number
  pyqCorrect: number
  answersWritten: number
}

export interface MockResult { stage: 'prelims_gs' | 'csat' | 'mains' | 'optional' | 'other'; takenOn: string; score: number | null; maxScore: number | null }

export type TopicStageName = 'not_started' | 'touched' | 'foundation_complete' | 'practised' | 'revision_current' | 'exam_ready' | 'revision_due'

export type Band = 'Getting started' | 'Building foundations' | 'Developing' | 'Exam-capable' | 'Strong' | 'Highly prepared'

/** Every calculated number carries its version and a plain-language "Why?". value null = not enough evidence. */
export interface Indicator {
  key: string
  value: number | null
  unit: 'percent' | 'index'
  band: Band | null
  reasons: string[]
  algorithmVersion: string
}
