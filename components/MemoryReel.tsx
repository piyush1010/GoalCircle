'use client'

import React, { useRef } from 'react'
import { toPng } from 'html-to-image'

interface MemoryReelProps {
  habitTitle: string
  streakCount: number
  userName?: string
}

export default function MemoryReel({ habitTitle, streakCount, userName = 'GoalCircle Builder' }: MemoryReelProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const downloadCard = async () => {
    if (!cardRef.current) return
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true })
      const link = document.createElement('a')
      link.download = `${habitTitle.toLowerCase().replace(/\s+/g, '-')}-streak.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to export milestone card:', err)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 my-6">
      {/* Milestone Card (Downloadable target) */}
      <div
        ref={cardRef}
        className="w-full max-w-sm p-6 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white shadow-2xl border border-white/20 relative overflow-hidden flex flex-col justify-between min-h-[220px]"
      >
        {/* Background Decorative Circles */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/20 rounded-full blur-xl" />

        {/* Card Header */}
        <div className="z-10 flex justify-between items-center">
          <span className="text-xs uppercase tracking-widest font-bold text-white/80">GoalCircle Reel</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md font-semibold">
            Milestone
          </span>
        </div>

        {/* Card Content */}
        <div className="z-10 my-4">
          <p className="text-4xl font-extrabold tracking-tight">{streakCount} Days</p>
          <p className="text-lg font-medium text-white/90 mt-1">Unstoppable on "{habitTitle}"</p>
        </div>

        {/* Card Footer */}
        <div className="z-10 flex justify-between items-end text-xs text-white/70 pt-4 border-t border-white/10">
          <span>@{userName}</span>
          <span>goalcircle.app</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={downloadCard}
        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold rounded-lg border border-slate-700 transition"
      >
        Download Shareable Reel 📸
      </button>
    </div>
  )
}