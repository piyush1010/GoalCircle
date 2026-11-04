// Offline logging: when a save fails for lack of network, keep the event on the device, show it
// immediately, and send it when the connection returns. The server stays the source of truth.
import type { TopicState } from './types'
import { addDays, nextIntervalDays } from './revision'

export interface QueuedEvent { id: string; node_id: string | null; kind: string; quantity: number; details: Record<string, unknown>; minutes: number | null; occurred_on: string }
export const QUEUE_KEY = 'goalyaar-prep-queue'

export function readQueue(storage: Pick<Storage, 'getItem'> | null): QueuedEvent[] {
  try { const raw = storage?.getItem(QUEUE_KEY); const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v : [] } catch { return [] }
}
export function writeQueue(storage: Pick<Storage, 'setItem' | 'removeItem'> | null, items: QueuedEvent[]) {
  try { if (items.length) storage?.setItem(QUEUE_KEY, JSON.stringify(items.slice(-500))); else storage?.removeItem(QUEUE_KEY) } catch { /* storage unavailable: event stays unsent */ }
}

export const looksOffline = (message: string | undefined, online: boolean) => !online || /failed to fetch|network|load failed|fetch failed/i.test(message ?? '')

/** The same change the ledger trigger makes, applied locally so the screen updates while offline. */
export function applyLocally(cur: TopicState | undefined, nodeId: string, e: { kind: string; details: Record<string, unknown>; occurred_on: string }, isSubtopic: boolean): TopicState | undefined {
  const s: TopicState = cur ? { ...cur } : { nodeId, touchedOn: null, foundation: {}, revisionCount: 0, lastRevisedOn: null, intervalDays: null, nextRevisionOn: null, pyqAttempted: 0, pyqCorrect: 0, answersWritten: 0 }
  const day = e.occurred_on
  if (e.kind === 'studied' && e.details.undo === true) {
    return { ...s, touchedOn: null, foundation: {}, ...(s.revisionCount === 0 ? { nextRevisionOn: null, intervalDays: null } : {}) }
  }
  s.touchedOn = s.touchedOn && s.touchedOn < day ? s.touchedOn : day
  if (e.kind === 'studied' || e.kind === 'foundation' || e.kind === 'notes') {
    if (!s.nextRevisionOn && !isSubtopic) { s.intervalDays = nextIntervalDays(0); s.nextRevisionOn = addDays(day, s.intervalDays) }
  } else if (e.kind === 'revised' && (!s.lastRevisedOn || day > s.lastRevisedOn)) {
    const recall = e.details.recall
    s.revisionCount += 1; s.lastRevisedOn = day
    s.intervalDays = recall === 'little' ? nextIntervalDays(0) : recall === 'some' ? nextIntervalDays(Math.max(0, s.revisionCount - 1)) : nextIntervalDays(s.revisionCount)
    s.nextRevisionOn = addDays(day, s.intervalDays)
  }
  return s
}
