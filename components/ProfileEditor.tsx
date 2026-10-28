'use client'

import { useEffect, useState } from 'react'
import AvatarEditor from '@/components/AvatarEditor'
import { supabase } from '@/utils/supabase'

export interface SavedProfile { fullName: string; username: string; bio: string; avatarUrl: string | null }

const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white'

/** The one place to edit your photo, name, username and bio (saved to your profile and sign-in details). */
export default function ProfileEditor({ onSaved, onCancel }: { onSaved: (profile: SavedProfile) => void; onCancel: () => void }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('full_name,username,bio,avatar_url').eq('id', user.id).maybeSingle()
      const meta = user.user_metadata || {}
      setFullName(data?.full_name || meta.full_name || meta.name || '')
      setUsername(data?.username || String(meta.handle || '').replace('@', '') || '')
      setBio(data?.bio || '')
      setAvatarUrl(data?.avatar_url || meta.avatar_url || null)
    })()
  }, [])

  const saveAvatar = async (next: string) => {
    if (!userId) return
    setAvatarUrl(next)
    await Promise.all([
      supabase.from('profiles').upsert({ id: userId, avatar_url: next, updated_at: new Date().toISOString() }),
      supabase.auth.updateUser({ data: { avatar_url: next } }),
    ])
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!userId) return
    const name = fullName.trim()
    const handle = username.trim().replace(/^@/, '').toLowerCase()
    if (name.length < 2) { setError('Write your name.'); return }
    if (!/^[a-z0-9_.]{3,30}$/.test(handle)) { setError('Username: 3–30 letters, numbers, dots or underscores.'); return }
    setSaving(true); setError(null)
    const { error: profileError } = await supabase.from('profiles').upsert({ id: userId, full_name: name, username: handle, bio: bio.trim() || null, avatar_url: avatarUrl, is_onboarded: true, updated_at: new Date().toISOString() })
    if (profileError) {
      setSaving(false)
      setError(profileError.code === '23505' ? 'That username is taken. Try another.' : 'Your profile could not be saved.')
      return
    }
    await supabase.auth.updateUser({ data: { full_name: name, handle: `@${handle}`, avatar_url: avatarUrl } })
    setSaving(false)
    onSaved({ fullName: name, username: handle, bio: bio.trim(), avatarUrl })
  }

  return (
    <form onSubmit={save} className="space-y-3">
      {userId && <AvatarEditor userId={userId} value={avatarUrl} name={fullName || username || 'GoalYaar member'} onSaved={(value) => void saveAvatar(value)} />}
      <div className="border-t border-slate-100 pt-3 dark:border-slate-800" />
      <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">Name</span>
        <input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={60} autoComplete="name" className={field} /></label>
      <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">Username</span>
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 pl-3 focus-within:border-amber-500 dark:border-slate-800 dark:bg-slate-950"><span className="text-sm text-slate-400">@</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={30} autoCapitalize="none" autoComplete="username" className="w-full bg-transparent px-1 py-2.5 text-sm text-slate-900 outline-none dark:text-white" /></div></label>
      <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">Bio <span className="font-normal text-slate-400">(optional)</span></span>
        <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={2} maxLength={200} placeholder="What are you working towards?" className={`${field} resize-none`} /></label>
      {error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold dark:border-slate-700">Cancel</button>
        <button type="submit" disabled={saving || !userId} className="flex-[2] rounded-xl bg-slate-900 dark:bg-slate-50 py-2.5 text-sm font-bold text-white dark:text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}
