'use client'

import { useEffect } from 'react'
import { syncDayEnd } from '@/lib/dayEnd'

/** Keeps "my day ends at" on this device in step with the account, once per app start. */
export default function DayEndSync() {
  useEffect(() => { void syncDayEnd().catch(() => { /* keep the device setting */ }) }, [])
  return null
}
