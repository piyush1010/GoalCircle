'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

/** True when the signed-in user is on the preparation-tracker beta allowlist (public.prep_beta). */
export function usePrepFeature(): boolean {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let active = true
    void supabase.rpc('has_feature', { feature: 'prep' }).then(({ data }) => { if (active) setEnabled(data === true) }, () => undefined)
    return () => { active = false }
  }, [])
  return enabled
}
