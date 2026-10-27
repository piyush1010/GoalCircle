'use client'

/**
 * The month as a ring: one segment per day, filled on days you showed up (checked in or
 * focused). Today's segment is outlined. Tap a segment to see that day.
 */
import { useState } from 'react'

export interface MonthDay { day: number; key: string; active: boolean; minutes: number; checkins: number; future: boolean; today: boolean }

const SIZE = 196
const CENTER = SIZE / 2
const RADIUS = 80
const STROKE = 16

function arc(index: number, total: number, gapDegrees = 3.2) {
  const span = 360 / total
  const start = (index * span - 90 + gapDegrees / 2) * (Math.PI / 180)
  const end = ((index + 1) * span - 90 - gapDegrees / 2) * (Math.PI / 180)
  const x1 = CENTER + RADIUS * Math.cos(start), y1 = CENTER + RADIUS * Math.sin(start)
  const x2 = CENTER + RADIUS * Math.cos(end), y2 = CENTER + RADIUS * Math.sin(end)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${RADIUS} ${RADIUS} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

export default function MonthRing({ days, monthName }: { days: MonthDay[]; monthName: string }) {
  const [picked, setPicked] = useState<MonthDay | null>(null)
  const shown = days.filter((day) => day.active).length
  const sofar = days.filter((day) => !day.future).length

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${shown} of ${sofar} days shown up in ${monthName}`}>
          <defs>
            <linearGradient id="ring-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fbbf24" />
              <stop offset="1" stopColor="#f97316" />
            </linearGradient>
          </defs>
          {days.map((day, index) => (
            <path key={day.key} d={arc(index, days.length)} fill="none" strokeLinecap="round" strokeWidth={STROKE}
              stroke={day.active ? 'url(#ring-fill)' : day.future ? 'var(--ring-future)' : 'var(--ring-missed)'}
              className="cursor-pointer transition-opacity hover:opacity-80" onClick={() => setPicked(day)} />
          ))}
          {days.map((day, index) => {
            if (!day.today) return null
            const angle = ((index + 0.5) * (360 / days.length) - 90) * (Math.PI / 180)
            const r = RADIUS + STROKE / 2 + 7
            return <circle key="today" cx={CENTER + r * Math.cos(angle)} cy={CENTER + r * Math.sin(angle)} r={3.5} className="fill-slate-900 dark:fill-white" />
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {picked ? <>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{monthName.slice(0, 3)} {picked.day}</span>
            <span className="text-2xl font-black">{picked.future ? '—' : picked.active ? '✓' : '·'}</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{picked.future ? 'Coming up' : picked.active ? `${picked.checkins ? `${picked.checkins} check-in${picked.checkins > 1 ? 's' : ''}` : ''}${picked.checkins && picked.minutes ? ' · ' : ''}${picked.minutes ? `${picked.minutes} min` : ''}` : 'Missed'}</span>
          </> : <>
            <span className="text-4xl font-black leading-none">{shown}</span>
            <span className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">of {sofar} days</span>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{monthName}</span>
          </>}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500" />Showed up</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: 'var(--ring-missed)' }} />Missed</span>
        {picked && <button type="button" onClick={() => setPicked(null)} className="pointer-events-auto font-bold text-amber-600 dark:text-amber-400">Month view</button>}
      </div>
    </div>
  )
}
