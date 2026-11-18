'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

const KEY = 'goalyaar-prep-active'
export const PREP_CHANGED_EVENT = 'goalyaar-prep-changed'
const EVENT = PREP_CHANGED_EVENT

/** Remember the latest known state on this device and tell open screens (nav, Today) to update. */
export function announcePrepActive(active: boolean) {
  try { window.localStorage.setItem(KEY, active ? '1' : '0') } catch { /* fine: next load asks the server */ }
  window.dispatchEvent(new Event(EVENT))
}

/**
 * Is this person preparing for an exam (a saved, active plan)? Answers instantly from the last known
 * value on this device, then checks the server once per page load.
 */
export function usePrepActive(): boolean {
  const [active, setActive] = useState(false)
  useEffect(() => {
    let alive = true
    const read = () => { try { setActive(window.localStorage.getItem(KEY) === '1') } catch { /* stays false */ } }
    const t = window.setTimeout(read, 0)
    window.addEventListener(EVENT, read)
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session || !alive) return
      const { data, error } = await supabase.from('prep_profiles').select('active').eq('user_id', session.user.id).maybeSingle()
      if (!alive || error) return
      const next = Boolean(data) && (data as { active: boolean | null }).active !== false
      try { if ((window.localStorage.getItem(KEY) === '1') !== next) announcePrepActive(next) } catch { setActive(next) }
    }, () => undefined)
    return () => { alive = false; window.clearTimeout(t); window.removeEventListener(EVENT, read) }
  }, [])
  return active
}

/**
 * Bring back exams that were just removed (the Undo after removing them). Works from any page, because
 * after the last exam goes the person is already on Today and the exam screens are gone.
 */
export async function bringBackExams(templateIds: string[]): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || !templateIds.length) return false
  const { error } = await supabase.from('prep_plans').update({ active: true, updated_at: new Date().toISOString() }).eq('user_id', session.user.id).in('template_id', templateIds)
  if (error) return false
  const { error: e2 } = await supabase.from('prep_profiles').update({ active: true }).eq('user_id', session.user.id)
  if (e2) return false
  announcePrepActive(true)
  return true
}
