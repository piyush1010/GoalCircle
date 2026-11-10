'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/utils/supabase'

/** Remove every file in a user's own folder, including subfolders. Best effort: deletion continues if a file is already gone. */
async function clearFolder(bucket: string, prefix: string): Promise<void> {
  const { data } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
  if (!data?.length) return
  const files = data.filter((item) => item.id).map((item) => `${prefix}/${item.name}`)
  for (const folder of data.filter((item) => !item.id)) await clearFolder(bucket, `${prefix}/${folder.name}`)
  for (let i = 0; i < files.length; i += 100) await supabase.storage.from(bucket).remove(files.slice(i, i + 100))
}

/** Settings: permanently delete the account and everything in it, after typing DELETE. */
export default function DeleteAccount() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = async () => {
    setBusy(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); setError('Please sign in again first.'); return }
    for (const bucket of ['avatars', 'goal-media', 'batch-proof']) { try { await clearFolder(bucket, user.id) } catch { /* continue */ } }
    const { error: rpcError } = await supabase.rpc('delete_my_account')
    if (rpcError) { setBusy(false); setError(rpcError.message.includes('Administrators') ? rpcError.message + '.' : 'Could not delete your account. Please try again, or email us.'); return }
    try { window.localStorage.clear() } catch { /* nothing stored */ }
    await supabase.auth.signOut()
    router.replace('/login?deleted=1')
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="w-full py-2.5 text-center text-xs font-semibold text-rose-600 dark:text-rose-400">Delete my account</button>

  return <div role="group" aria-label="Delete my account" className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/60 dark:bg-rose-950/30">
    <p className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300"><Trash2 className="h-4 w-4" />Delete my account</p>
    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">This permanently deletes your account, goals, check-ins and photos, exam plans, ticks, revisions, mistakes, notes and posts. Circles and batches you run are deleted too. It cannot be undone. You can download your data first, above.</p>
    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Type DELETE to confirm
      <input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" className="mt-1 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm dark:border-rose-900 dark:bg-slate-900" />
    </label>
    {error && <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</p>}
    <div className="flex gap-2">
      <button type="button" disabled={busy} onClick={() => { setOpen(false); setTyped(''); setError(null) }} className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">Cancel</button>
      <button type="button" disabled={busy || typed.trim().toUpperCase() !== 'DELETE'} onClick={() => void remove()} className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Deleting…' : 'Delete forever'}</button>
    </div>
  </div>
}
