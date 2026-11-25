import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import LogoMark from '@/components/LogoMark'
import ThemeToggle from '@/components/ThemeToggle'
import { APP_NAME, CONTACT_EMAIL } from '@/lib/appInfo'

export const metadata: Metadata = {
  title: `Terms and community rules | ${APP_NAME}`,
  description: `The terms for using ${APP_NAME}, and the rules for everything people post in it.`,
}

const UPDATED = '25 November 2026'

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-6 border-t border-slate-200 py-6 dark:border-slate-800">
    <h2 className="text-base font-semibold">{title}</h2>
    <div className="mt-2 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{children}</div>
  </section>
}

export default function TermsPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-slate-900 underline underline-offset-2 dark:text-white">{CONTACT_EMAIL}</a>
  const link = 'font-medium text-slate-900 underline underline-offset-2 dark:text-white'
  return <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-6 text-slate-950 dark:bg-[#07101F] dark:text-slate-50">
    <div className="mx-auto max-w-2xl">
      <header className="flex items-center justify-between pb-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold"><LogoMark size={32} />{APP_NAME}</Link>
        <ThemeToggle />
      </header>
      <Link href="/about" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-950 dark:hover:text-white"><ArrowLeft className="h-4 w-4" />Back</Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Terms and community rules</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated {UPDATED}</p>
      <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">These are the terms for using {APP_NAME}. By creating an account or posting anything, you agree to them. How we handle your data is in the <Link href="/privacy" className={link}>privacy policy</Link>.</p>

      <Section id="account" title="Your account">
        <p>You need to be 18 or older to use {APP_NAME}. Use your real name or a name people know you by, keep your password to yourself, and use one account per person.</p>
        <p>You can delete your account at any time in Settings. We may suspend or delete an account that breaks these rules.</p>
      </Section>

      <Section id="rules" title="Community rules">
        <p>Communities, circles, batches, check-ins, comments and profiles are seen by other people. Everything you post there must follow these rules. Do not post or send:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>abuse, bullying, threats or harassment of anyone</li>
          <li>hate against people for their religion, caste, gender, race, disability, sexuality or where they come from</li>
          <li>sexual or nude content of any kind</li>
          <li>anything that sexualises or endangers a child. We have zero tolerance for this: we remove it, close the account and report it to the authorities</li>
          <li>violence, or anything that encourages self-harm, suicide or eating disorders</li>
          <li>spam, adverts, scams, paid promotions or links to them</li>
          <li>cheating: leaked papers, selling answers, or helping anyone break an exam&apos;s rules</li>
          <li>anything you don&apos;t have the right to share, such as paid coaching notes, books or videos, or someone else&apos;s photos</li>
          <li>other people&apos;s phone numbers, addresses or other private details</li>
          <li>false claims of being a government body, a commission, an official or someone you are not</li>
          <li>anything illegal in India or where you live</li>
        </ul>
      </Section>

      <Section id="moderation" title="Reporting, blocking and what we do">
        <p>Every post, answer, comment and profile has a Report option, and you can block anyone. Blocked people can&apos;t see your posts or answers, and you won&apos;t see theirs. You can unblock them in Settings.</p>
        <p>We look at every report, usually within a day. When a few people report the same post, it is hidden straight away until we check it. If something breaks these rules we remove it, and we may warn, suspend or delete the account that posted it. Serious cases, including anything that endangers a child, are reported to the police.</p>
        <p>If you think we removed something by mistake, write to {mail}.</p>
      </Section>

      <Section id="content" title="What you post">
        <p>What you post stays yours. By posting it, you let {APP_NAME} store it and show it to the people you chose to share it with, only to run the app. Delete a post and it is gone from the app.</p>
      </Section>

      <Section id="mentors" title="Mentors and batches">
        <p>Teachers, coaches and trainers can run batches for free. Mentors are responsible for what they post and for how they treat their students. {APP_NAME} does not take payments, and any arrangement between a mentor and a student is between them.</p>
      </Section>

      <Section id="exams" title="Exam information">
        <p>{APP_NAME} is an independent app and does not represent any government body, commission or exam board. Syllabi and dates come from each exam&apos;s official notices (see the <Link href="/about#sources" className={link}>official sources</Link>), and we work to keep them right, but they can change or contain mistakes. Always check the latest official notice before you apply or plan around a date.</p>
      </Section>

      <Section id="health" title="Fitness and health goals">
        <p>{APP_NAME} helps you keep track of habits. It does not give medical advice. Talk to a doctor before starting a new exercise or diet plan, especially if you have a health condition.</p>
      </Section>

      <Section id="service" title="The service">
        <p>{APP_NAME} is free and provided as it is. We work to keep it running and your data safe, but we can&apos;t promise it will always be available or free of mistakes, and we are not responsible for exam results or other outcomes. We may change or end features; if we ever close the app, we will give notice so you can download your data.</p>
        <p>These terms are governed by the laws of India. If we change them in a way that matters, we will tell you in the app and ask you to agree again before you next post.</p>
      </Section>

      <Section id="contact" title="Contact">
        <p>Questions, appeals and safety concerns, including anything involving a child: {mail}.</p>
      </Section>
    </div>
  </main>
}
