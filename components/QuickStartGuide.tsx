'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  CircleUserRound,
  Flame,
  LayoutDashboard,
  Plus,
  Target,
  UsersRound,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface GuideStep {
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
  secondaryIcon?: LucideIcon
  accent: string
}

const guideSteps: GuideStep[] = [
  {
    eyebrow: 'Welcome to GoalYaar',
    title: 'Turn an intention into a visible commitment',
    description:
      'Start by declaring one meaningful goal. You decide whether it is public or private, and you stay in control of what you share.',
    icon: Target,
    accent: 'bg-amber-500 text-slate-950',
  },
  {
    eyebrow: 'Feed',
    title: 'See real progress from people you support',
    description:
      'The Feed is where public goals and daily proof appear. Boost a win, leave a comment, share a post, or send a timely nudge.',
    icon: Flame,
    accent: 'bg-orange-500 text-white',
  },
  {
    eyebrow: 'Create',
    title: 'Declare a goal or post today’s progress',
    description:
      'Use the centre Create button to publish a new public goal with a photo or reel, or check in on a goal you are already pursuing.',
    icon: Plus,
    accent: 'bg-amber-500 text-slate-950',
  },
  {
    eyebrow: 'Circles and Progress',
    title: 'Build accountability without the noise',
    description:
      'Circles keep accountability focused among friends. Progress shows your active goals, streaks, focus time, and consistency.',
    icon: UsersRound,
    secondaryIcon: LayoutDashboard,
    accent: 'bg-emerald-500 text-white',
  },
  {
    eyebrow: 'Profile and notifications',
    title: 'Your GoalYaar, at a glance',
    description:
      'Profile is your home after sign-in. Manage your identity and settings here, and use notifications to keep up with nudges, comments, and circle invites.',
    icon: CircleUserRound,
    secondaryIcon: Bell,
    accent: 'bg-slate-900 text-white dark:bg-white dark:text-slate-950',
  },
]

interface QuickStartGuideProps {
  open: boolean
  onComplete: () => void
}

export default function QuickStartGuide({ open, onComplete }: QuickStartGuideProps) {
  const [stepIndex, setStepIndex] = useState(0)

  const closeGuide = useCallback(() => {
    setStepIndex(0)
    onComplete()
  }, [onComplete])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeGuide()
      if (event.key === 'ArrowRight') {
        setStepIndex((current) => Math.min(current + 1, guideSteps.length - 1))
      }
      if (event.key === 'ArrowLeft') {
        setStepIndex((current) => Math.max(current - 1, 0))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeGuide, open])

  if (!open) return null

  const step = guideSteps[stepIndex]
  const Icon = step.icon
  const SecondaryIcon = step.secondaryIcon
  const isLastStep = stepIndex === guideSteps.length - 1

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-guide-title"
        aria-describedby="quick-guide-description"
        className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#101b2d]"
      >
        <div className="relative overflow-hidden border-b border-slate-200 bg-slate-50 px-6 pb-7 pt-6 dark:border-slate-800 dark:bg-[#07101f]">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-amber-500/15 blur-2xl" />
          <button
            type="button"
            onClick={closeGuide}
            aria-label="Close quick guide"
            className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className={`relative mb-5 grid h-14 w-14 place-items-center rounded-2xl shadow-lg ${step.accent}`}>
            <Icon className="h-6 w-6" strokeWidth={2.4} />
            {SecondaryIcon && (
              <span className="absolute -bottom-2 -right-2 grid h-7 w-7 place-items-center rounded-xl border-2 border-white bg-slate-700 text-white dark:border-[#07101f]">
                <SecondaryIcon className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <p className="relative text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
            {step.eyebrow}
          </p>
          <h2 id="quick-guide-title" className="relative mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            {step.title}
          </h2>
          <p id="quick-guide-description" className="relative mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {step.description}
          </p>
        </div>

        <div className="px-6 pb-6 pt-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex gap-1.5" aria-label={`Step ${stepIndex + 1} of ${guideSteps.length}`}>
              {guideSteps.map((item, index) => (
                <button
                  type="button"
                  key={item.title}
                  onClick={() => setStepIndex(index)}
                  aria-label={`Show guide step ${index + 1}`}
                  className={`h-1.5 rounded-full transition-all ${index === stepIndex ? 'w-7 bg-amber-500' : 'w-2 bg-slate-200 dark:bg-slate-700'}`}
                />
              ))}
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {stepIndex + 1} / {guideSteps.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={() => setStepIndex((current) => current - 1)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={closeGuide}
                className="rounded-xl px-3 py-3 text-xs font-bold text-slate-500 transition hover:text-slate-900 dark:hover:text-white"
              >
                Skip tour
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLastStep ? closeGuide() : setStepIndex((current) => current + 1))}
              className="ml-auto rounded-xl bg-amber-500 px-5 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-[0.98]"
            >
              {isLastStep ? 'Start using GoalYaar' : 'Next'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
