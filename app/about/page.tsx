import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import LogoMark from '@/components/LogoMark'
import ThemeToggle from '@/components/ThemeToggle'
import { APP_NAME, APP_VERSION, CONTACT_EMAIL } from '@/lib/appInfo'

export const metadata: Metadata = {
  title: `About | ${APP_NAME}`,
  description: `${APP_NAME} is an independent study planner for UPSC, state PCS, SSC, banking, teaching, judiciary and CAT preparation.`,
}

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-6 border-t border-slate-200 py-6 dark:border-slate-800">
    <h2 className="text-base font-semibold">{title}</h2>
    <div className="mt-2 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{children}</div>
  </section>
}

export default function AboutPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-amber-700 underline underline-offset-2 dark:text-amber-400">{CONTACT_EMAIL}</a>
  return <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-6 text-slate-950 dark:bg-[#07101F] dark:text-slate-50">
    <div className="mx-auto max-w-2xl">
      <header className="flex items-center justify-between pb-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold"><LogoMark size={32} />{APP_NAME}</Link>
        <ThemeToggle />
      </header>
      <Link href="/settings" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-950 dark:hover:text-white"><ArrowLeft className="h-4 w-4" />Back</Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">About {APP_NAME}</h1>
      <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">A free study planner for competitive exams. It turns your syllabus and exam date into a daily plan, reminds you to revise before you forget, and lets you prepare alongside a mentor, a batch or friends.</p>

      <Section id="disclaimer" title="Not affiliated with any commission">
        <p>{APP_NAME} is an independent study app. It is not affiliated with, authorised or endorsed by the Union Public Service Commission (UPSC), the Uttar Pradesh Public Service Commission (UPPSC), the Staff Selection Commission, any state public service commission, any High Court, or any other government body.</p>
        <p>Commission and exam names are used only to say which exam a feature is for.</p>
      </Section>

      <Section id="content" title="Syllabus, dates and questions">
        <p>Syllabi are organised from each exam&apos;s published scheme into subjects, topics and subtopics in our own words. Exam dates are shown as announced; always confirm them on the commission&apos;s official website.</p>
        <p>Previous year questions, where shown, are taken from papers the commissions publish on their official websites. Each one shows its exam, year and paper. They are included to help you practise and remain the work of the commission that set them. Answers follow the official answer keys where one has been published, and explanations are written by us.</p>
      </Section>

      <Section id="contact" title="Mistakes, questions and removal requests">
        <p>Spotted a mistake in a syllabus, date or question? Use Settings → Send feedback, or write to {mail}.</p>
        <p>If you represent a commission or rights holder and would like something removed, write to {mail} and we will act on it promptly.</p>
      </Section>

      <Section id="delete" title="Deleting your account">
        <p>In the app: Settings → Delete my account. This permanently removes your account, goals, check-ins, preparation data and posts.</p>
        <p>Can&apos;t sign in? Email {mail} from the address you signed up with, with the subject &ldquo;Delete my account&rdquo;. We delete it within 7 days and confirm by email.</p>
      </Section>

      <Section title="Privacy">
        <p>What we store, why, and who processes it: <Link href="/privacy" className="font-medium text-amber-700 underline underline-offset-2 dark:text-amber-400">Privacy policy</Link>.</p>
      </Section>

      <p className="border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800">{APP_NAME} · version {APP_VERSION} · Free for students, no ads.</p>
    </div>
  </main>
}
