'use client'

import { Download, ExternalLink } from 'lucide-react'
import { calendarFileName, createGoalIcs, createGoogleCalendarUrl, type GoalCalendarEvent } from '@/lib/calendar'

interface GoalCalendarActionsProps {
  goalId: string
  title: string
  targetDate: string
}

export default function GoalCalendarActions({ goalId, title, targetDate }: GoalCalendarActionsProps) {
  const calendarEvent = (): GoalCalendarEvent => ({
    goalId,
    title,
    targetDate,
    url: `${window.location.origin}/goal/${goalId}`,
  })

  const openGoogleCalendar = () => {
    window.open(createGoogleCalendarUrl(calendarEvent()), '_blank', 'noopener,noreferrer')
  }

  const downloadCalendarFile = () => {
    const contents = createGoalIcs(calendarEvent())
    const href = URL.createObjectURL(new Blob([contents], { type: 'text/calendar;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = calendarFileName(title)
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(href)
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Calendar export options">
      <button type="button" onClick={openGoogleCalendar} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-[10px] font-black text-slate-950 shadow-sm transition hover:bg-amber-400">
        <ExternalLink className="h-3.5 w-3.5" />
        Google Calendar
      </button>
      <button type="button" onClick={downloadCalendarFile} aria-label="Download calendar file for Apple Calendar or Outlook" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-700 transition hover:border-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
        <Download className="h-3.5 w-3.5 text-amber-500" />
        Apple / Outlook
      </button>
    </div>
  )
}
