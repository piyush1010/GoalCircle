import { supabase } from '@/utils/supabase'

/**
 * Saves the one daily reminder on the server, so it can reach the phone even when the app
 * is closed (sent only if you haven't checked in by then). Safe to call before the
 * database has the reminder columns: it simply does nothing.
 */
export async function saveDailyReminder(enabled: boolean, time: string) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return false
  let timeZone = 'Asia/Kolkata'
  try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || timeZone } catch { /* default */ }
  const { error } = await supabase.from('user_preferences').upsert(
    { user_id: session.user.id, daily_reminder_enabled: enabled, daily_reminder_time: time, time_zone: timeZone, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
  return !error
}

export async function readDailyReminder(): Promise<{ enabled: boolean; time: string } | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null
  const { data, error } = await supabase.from('user_preferences').select('daily_reminder_enabled,daily_reminder_time').eq('user_id', session.user.id).maybeSingle()
  if (error || !data) return null
  const row = data as { daily_reminder_enabled?: boolean; daily_reminder_time?: string }
  return { enabled: !!row.daily_reminder_enabled, time: String(row.daily_reminder_time || '20:00').slice(0, 5) }
}
