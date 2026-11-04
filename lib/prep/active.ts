'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

const KEY = 'goalyaar-prep-active'
const EVENT = 'goalyaar-prep-changed'

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
