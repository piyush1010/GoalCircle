import { describe, expect, it } from 'vitest'
import { applyLocally, looksOffline, readQueue, writeQueue, type QueuedEvent } from '../offline'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) } } }
const q = (id: string): QueuedEvent => ({ id, node_id: 'n', kind: 'studied', quantity: 1, details: {}, minutes: null, occurred_on: '2026-11-04' })

describe('offline queue', () => {
  it('round-trips, clears, and survives bad data', () => {
    const s = mem()
    writeQueue(s, [q('1'), q('2')])
    expect(readQueue(s).map((x) => x.id)).toEqual(['1', '2'])
    writeQueue(s, [])
    expect(readQueue(s)).toEqual([])
    s.setItem('goalyaar-prep-queue', '{oops')
    expect(readQueue(s)).toEqual([])
    expect(readQueue(null)).toEqual([])
  })
  it('recognises network failures', () => {
    expect(looksOffline('TypeError: Failed to fetch', true)).toBe(true)
    expect(looksOffline('new row violates row-level security', true)).toBe(false)
    expect(looksOffline(undefined, false)).toBe(true)
  })
})

describe('local apply mirrors the ledger trigger', () => {
  it('starts a topic schedule but not a subtopic one, revises, and undoes', () => {
    const topic = applyLocally(undefined, 't', { kind: 'studied', details: {}, occurred_on: '2026-11-04' }, false)!
    expect([topic.touchedOn, topic.nextRevisionOn, topic.intervalDays]).toEqual(['2026-11-04', '2026-11-07', 3])
    const sub = applyLocally(undefined, 's', { kind: 'studied', details: {}, occurred_on: '2026-11-04' }, true)!
    expect([sub.touchedOn, sub.nextRevisionOn]).toEqual(['2026-11-04', null])
    const rev = applyLocally(topic, 't', { kind: 'revised', details: {}, occurred_on: '2026-11-07' }, false)!
    expect([rev.revisionCount, rev.nextRevisionOn]).toEqual([1, '2026-11-14'])
    const some = applyLocally(rev, 't', { kind: 'revised', details: { recall: 'some' }, occurred_on: '2026-11-14' }, false)!
    expect([some.revisionCount, some.intervalDays]).toEqual([2, 7])
    const little = applyLocally(some, 't', { kind: 'revised', details: { recall: 'little' }, occurred_on: '2026-11-21' }, false)!
    expect([little.intervalDays, little.nextRevisionOn]).toEqual([3, '2026-11-24'])
    const undone = applyLocally(sub, 's', { kind: 'studied', details: { undo: true }, occurred_on: '2026-11-04' }, true)!
    expect(undone.touchedOn).toBeNull()
  })

  it('undoes today\'s revision back to the saved schedule', () => {
    const before = { nodeId: 't', touchedOn: '2026-11-01', foundation: {}, revisionCount: 1, lastRevisedOn: '2026-11-04', intervalDays: 7, nextRevisionOn: '2026-11-11', pyqAttempted: 0, pyqCorrect: 0, answersWritten: 0 }
    const rev = applyLocally(before, 't', { kind: 'revised', details: { recall: 'all' }, occurred_on: '2026-11-11' }, false)!
    expect(rev.revisionCount).toBe(2)
    const prev = { revision_count: 1, last_revised_on: '2026-11-04', interval_days: 7, next_revision_on: '2026-11-11' }
    const back = applyLocally(rev, 't', { kind: 'revised', details: { undo: true, prev }, occurred_on: '2026-11-11' }, false)!
    expect([back.revisionCount, back.lastRevisedOn, back.intervalDays, back.nextRevisionOn]).toEqual([1, '2026-11-04', 7, '2026-11-11'])
    // a stray undo on another day changes nothing
    expect(applyLocally(back, 't', { kind: 'revised', details: { undo: true, prev }, occurred_on: '2026-11-12' }, false)).toEqual(back)
  })
})
