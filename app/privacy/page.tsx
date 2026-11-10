import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import LogoMark from '@/components/LogoMark'
import ThemeToggle from '@/components/ThemeToggle'
import { APP_NAME, CONTACT_EMAIL } from '@/lib/appInfo'

export const metadata: Metadata = {
  title: `Privacy policy | ${APP_NAME}`,
  description: `What ${APP_NAME} stores, why, who processes it, and how to export or delete it.`,
}

const UPDATED = '10 November 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-t border-slate-200 py-6 dark:border-slate-800">
    <h2 className="text-base font-semibold">{title}</h2>
    <div className="mt-2 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{children}</div>
  </section>
}

export default function PrivacyPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-amber-700 underline underline-offset-2 dark:text-amber-400">{CONTACT_EMAIL}</a>
  return <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-6 text-slate-950 dark:bg-[#07101F] dark:text-slate-50">
    <div className="mx-auto max-w-2xl">
      <header className="flex items-center justify-between pb-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold"><LogoMark size={32} />{APP_NAME}</Link>
        <ThemeToggle />
      </header>
      <Link href="/about" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-950 dark:hover:text-white"><ArrowLeft className="h-4 w-4" />About</Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Privacy policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated {UPDATED}</p>
      <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">{APP_NAME} keeps only what it needs to plan your preparation and run your goals, circles and batches. We do not show ads, sell your data, or build advertising profiles.</p>

      <Section title="What we store">
        <p><b>Account:</b> your email address, name and username, and your Google profile photo if you sign in with Google.</p>
        <p><b>What you create:</b> goals, check-ins and their photos, comments, circles and batch posts, focus time, and anything you send as feedback.</p>
        <p><b>Exam preparation:</b> your exams and dates, study hours, subtopics ticked, revisions, mistakes, notes, mock scores and answers you share for review.</p>
        <p><b>Notifications:</b> if you turn on phone notifications, a notification address for your device, and your reminder time.</p>
        <p><b>Error reports:</b> when something breaks, the error message, the page and your browser type, so we can fix it.</p>
      </Section>

      <Section title="Who can see it">
        <p>Your preparation data is private to you. A mentor sees your progress only if you choose to share it with them. Goals and check-ins are visible to the people you choose: only you, your circle, or everyone. Others preparing for the same exam see anonymous counts, never your name.</p>
        <p>The app&apos;s administrator can see counts of activity and error reports to keep the app working, not your notes, mistakes or private posts.</p>
      </Section>

      <Section title="Who processes it for us">
        <p><b>Supabase</b> stores the database, sign-in and uploaded photos. <b>Vercel</b> hosts the app. <b>Google</b> handles &ldquo;Sign in with Google&rdquo; if you use it. Your phone&apos;s push service (such as Google or Apple) delivers notifications you turn on. Each processes data only to provide its service.</p>
      </Section>

      <Section title="How long we keep it">
        <p>Until you delete it or delete your account. Deleting your account removes your data from the app straight away; copies in service providers&apos; routine backups expire on their own schedules.</p>
      </Section>

      <Section title="Your choices">
        <p><b>Export:</b> Settings → Download my data gives you everything as one file.</p>
        <p><b>Correct:</b> edit your profile, goals and preparation in the app.</p>
        <p><b>Delete:</b> Settings → Delete my account, or email {mail} if you cannot sign in. See <Link href="/about#delete" className="font-medium text-amber-700 underline underline-offset-2 dark:text-amber-400">deleting your account</Link>.</p>
        <p><b>Notifications:</b> turn them off any time in Settings.</p>
      </Section>

      <Section title="Age">
        <p>{APP_NAME} is meant for people aged 18 and over.</p>
      </Section>

      <Section title="Contact">
        <p>Questions about privacy: {mail}. We will update this page when anything changes and show the new date at the top.</p>
      </Section>
    </div>
  </main>
}
