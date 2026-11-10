import { supabase } from '@/utils/supabase'
import { dayEndsHour, setDayEndsHourLocal } from '@/lib/exams'

export const DAY_END_EVENT = 'goalyaar-day-end-changed'

/** Read the account's "my day ends at" and keep this device in step. */
export async function syncDayEnd(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return dayEndsHour()
  const { data, error } = await supabase.from('user_preferences').select('day_ends_hour').eq('user_id', session.user.id).maybeSingle()
  if (error) return dayEndsHour() // database not updated yet: keep the device setting
  const hour = Number((data as { day_ends_hour?: number } | null)?.day_ends_hour ?? 0)
  if (hour !== dayEndsHour()) { setDayEndsHourLocal(hour); window.dispatchEvent(new Event(DAY_END_EVENT)) }
  return hour
}

/** Save "my day ends at" to the account and this device. */
export async function saveDayEnd(hour: number): Promise<boolean> {
  setDayEndsHourLocal(hour)
  window.dispatchEvent(new Event(DAY_END_EVENT))
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return false
  const { error } = await supabase.from('user_preferences').upsert({ user_id: session.user.id, day_ends_hour: hour, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  return !error
}
