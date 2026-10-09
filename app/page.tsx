'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, Flame, Users, Timer, Film, ArrowRight } from 'lucide-react'
import { supabase } from '@/utils/supabase'

// Optional shared demo account. Create a normal user in Supabase with seeded goals/posts,
// then set both variables in Vercel. The button stays hidden until both are present.
const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD

// Real screenshots of the app, stored in /public/screenshots. Add entries as files are added.
const SCREENSHOTS: Array<{ src: string; alt: string }> = []

const FEATURES = [
  { icon: Flame, title: 'Announce a goal', body: 'Set a goal, pick who can see it, and start a streak.' },
  { icon: Camera, title: 'Post daily proof', body: 'Check in with a photo, note or focus session to keep the streak alive.' },
  { icon: Users, title: 'Private circles', body: 'Friends boost, comment and nudge you when you go quiet.' },
  { icon: Timer, title: 'Focus room', body: 'Timed focus sessions are logged straight to your goal.' },
  { icon: Film, title: 'Memory reels', body: 'Sustained progress turns into a shareable reel.' },
]

export default function LandingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) router.replace('/feed')
      else setChecking(false)
    })
  }, [router])

  const startDemo = async () => {
    if (!DEMO_EMAIL || !DEMO_PASSWORD) return
    setDemoLoading(true)
    setDemoError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
    if (error) {
      setDemoError('The demo account is unavailable right now. Please sign up instead.')
      setDemoLoading(false)
      return
    }
    router.replace('/feed')
  }

  if (checking) return <div className="min-h-screen" />

  return (
    <main className="min-h-screen px-5 py-12 max-w-3xl mx-auto">
      <section className="text-center">
        <p className="text-amber-500 font-semibold text-sm tracking-wide uppercase">GoalCircle</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">
          Goals stick when your friends are watching.
        </h1>
        <p className="mt-4 text-slate-500 dark:text-slate-400 text-lg">
          A social accountability app: announce a goal, post daily proof, and keep each other going.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {DEMO_EMAIL && DEMO_PASSWORD && (
            <button
              onClick={startDemo}
              disabled={demoLoading}
              className="px-6 py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-amber-500 to-orange-500 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {demoLoading ? 'Opening demo…' : 'Try the demo account'} <ArrowRight size={18} />
            </button>
          )}
          <Link
            href="/login?mode=signup"
            className={`px-6 py-3 rounded-xl font-semibold inline-flex items-center justify-center ${
              DEMO_EMAIL && DEMO_PASSWORD
                ? 'border border-slate-300 dark:border-slate-700'
                : 'text-black bg-gradient-to-r from-amber-500 to-orange-500'
            }`}
          >
            Create an account
          </Link>
          <Link href="/login" className="px-6 py-3 rounded-xl font-medium text-slate-500 dark:text-slate-400">
            Log in
          </Link>
        </div>
        {demoError && <p className="mt-3 text-sm text-red-500">{demoError}</p>}
        {DEMO_EMAIL && DEMO_PASSWORD && (
          <p className="mt-3 text-xs text-slate-500">The demo account is shared — please keep posts friendly.</p>
        )}
      </section>

      {SCREENSHOTS.length > 0 && (
        <section className="mt-12 flex gap-4 overflow-x-auto snap-x pb-2">
          {SCREENSHOTS.map((shot) => (
            <Image
              key={shot.src}
              src={shot.src}
              alt={shot.alt}
              width={360}
              height={780}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 snap-center shrink-0 w-56 sm:w-64 h-auto"
            />
          ))}
        </section>
      )}

      <section className="mt-12 grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <Icon className="text-amber-500" size={22} />
            <h2 className="mt-3 font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{body}</p>
          </div>
        ))}
      </section>

      <p className="mt-12 text-center text-xs text-slate-500">
        Built with Next.js, Supabase and Capacitor ·{' '}
        <a href="https://github.com/piyush1010/GoalCircle" className="underline">Source on GitHub</a>
      </p>
    </main>
  )
}
