'use client'

import { useState } from 'react'
import { MessageSquareHeart } from 'lucide-react'
import { supabase } from '@/utils/supabase'

export default function FeedbackCard() {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (message.trim().length < 3) return
    setSending(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setSending(false); setStatus('error'); return }
    const { error } = await supabase.from('feedback').insert({ user_id: session.user.id, message: message.trim(), page: window.location.pathname })
    setSending(false)
    if (error) setStatus('error')
    else { setStatus('sent'); setMessage('') }
  }

  return (
    <form onSubmit={send} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <label htmlFor="feedback" className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-400"><MessageSquareHeart className="h-3.5 w-3.5" />Send feedback</label>
      <textarea id="feedback" value={message} onChange={(event) => { setMessage(event.target.value); setStatus('idle') }} rows={3} maxLength={2000} placeholder="What's working, what's confusing, what should we add?" className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-500 dark:border-slate-800 dark:bg-slate-950" />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500" role="status">{status === 'sent' ? 'Thank you! We read every message.' : status === 'error' ? 'Could not send. Please try again.' : 'Goes straight to the GoalYaar team.'}</p>
        <button type="submit" disabled={sending || message.trim().length < 3} className="shrink-0 rounded-xl bg-slate-900 dark:bg-slate-50 px-4 py-2 text-xs font-bold text-white dark:text-slate-900 disabled:opacity-50">{sending ? 'Sending…' : 'Send'}</button>
      </div>
    </form>
  )
}
