import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import LogoMark from '@/components/LogoMark'
import ThemeToggle from '@/components/ThemeToggle'
import { APP_NAME, APP_VERSION, CONTACT_EMAIL } from '@/lib/appInfo'

export const metadata: Metadata = {
  title: `About | ${APP_NAME}`,
  description: `${APP_NAME} is a free, independent app for keeping goals: exam preparation, fitness, reading, health and mind, and new skills, with mentors, batches and communities.`,
}

// Where each exam's syllabus and dates are officially published (also listed in the Play Store description).
const OFFICIAL_SOURCES: [string, string, string][] = [
  ['UPSC Civil Services, IFoS, EPFO and CDS', 'Union Public Service Commission', 'https://upsc.gov.in'],
  ['UPPCS and UP PCS-J', 'Uttar Pradesh Public Service Commission', 'https://uppsc.up.nic.in'],
  ['BPSC', 'Bihar Public Service Commission', 'https://bpsc.bihar.gov.in'],
  ['MPSC Rajyaseva', 'Maharashtra Public Service Commission', 'https://mpsc.gov.in'],
  ['HCS', 'Haryana Public Service Commission', 'https://hpsc.gov.in'],
  ['JKPSC CCE', 'Jammu and Kashmir Public Service Commission', 'https://jkpsc.nic.in'],
  ['SSC CGL and SSC CHSL', 'Staff Selection Commission', 'https://ssc.gov.in'],
  ['RRB NTPC', 'Railway Recruitment Boards', 'https://www.rrbapply.gov.in'],
  ['Bank PO (IBPS)', 'Institute of Banking Personnel Selection', 'https://www.ibps.in'],
  ['Bank PO (SBI)', 'State Bank of India', 'https://sbi.co.in/web/careers'],
  ['CTET', 'Central Board of Secondary Education', 'https://ctet.nic.in'],
  ['UPTET', 'Uttar Pradesh Education Service Selection Commission', 'https://upessc.up.gov.in'],
  ['MP Civil Judge', 'High Court of Madhya Pradesh', 'https://mphc.gov.in'],
  ['CAT', 'Indian Institutes of Management', 'https://iimcat.ac.in'],
]

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-6 border-t border-slate-200 py-6 dark:border-slate-800">
    <h2 className="text-base font-semibold">{title}</h2>
    <div className="mt-2 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{children}</div>
  </section>
}

export default function AboutPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-slate-900 underline underline-offset-2 dark:text-white">{CONTACT_EMAIL}</a>
  return <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-6 text-slate-950 dark:bg-[#07101F] dark:text-slate-50">
    <div className="mx-auto max-w-2xl">
      <header className="flex items-center justify-between pb-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold"><LogoMark size={32} />{APP_NAME}</Link>
        <ThemeToggle />
      </header>
      <Link href="/settings" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-950 dark:hover:text-white"><ArrowLeft className="h-4 w-4" />Back</Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">About {APP_NAME}</h1>
      <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">A free app for keeping your goals: an exam, fitness, reading, your mind or a new skill. It puts everything due today on one short list, and lets you work alongside a mentor, a batch, friends or a community with the same goal. For exams, it turns the syllabus and your exam date into a daily plan and brings each topic back before you forget it.</p>

      <Section id="disclaimer" title="Not affiliated with any commission">
        <p>{APP_NAME} is an independent app. It is not affiliated with, authorised or endorsed by the Union Public Service Commission (UPSC), the Uttar Pradesh Public Service Commission (UPPSC), the Staff Selection Commission, the Railway Recruitment Boards, any state public service commission, any High Court, or any other government body.</p>
        <p>Commission and exam names are used only to say which exam a feature is for.</p>
      </Section>

      <Section id="sources" title="Official sources">
        <p>{APP_NAME} is not a government app and does not represent any government body. Syllabi and exam dates in {APP_NAME} come from each exam&apos;s official notices, published at the websites below. Always check the latest notice there before you apply or plan around a date.</p>
        <ul className="space-y-1.5">
          {OFFICIAL_SOURCES.map(([exams, body, url]) => <li key={url}><b className="font-medium text-slate-900 dark:text-white">{exams}</b>: {body}, <a href={url} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">{url.replace(/^https:\/\//, '')}</a></li>)}
        </ul>
      </Section>

      <Section id="content" title="Syllabus, dates and questions">
        <p>Syllabi are organised from each exam&apos;s published scheme into subjects, topics and subtopics in our own words. Exam dates are shown as announced; always confirm them on the commission&apos;s official website.</p>
        <p>Previous year questions, where shown, are taken from papers the commissions publish on their official websites. Each one shows its exam, year and paper. They are included to help you practise and remain the work of the commission that set them. Answers follow the official answer keys where one has been published, and explanations are written by us.</p>
      </Section>

      <Section id="terms" title="Terms and community rules">
        <p>Everyone agrees to the <Link href="/terms" className="font-medium text-slate-900 underline underline-offset-2 dark:text-white">terms and community rules</Link> before posting. Every post, answer, comment and profile can be reported, and anyone can be blocked. We look at every report, usually within a day.</p>
      </Section>

      <Section id="contact" title="Mistakes, questions and removal requests">
        <p>Spotted a mistake in a syllabus, date or question? Use Settings → Send feedback, or write to {mail}.</p>
        <p>If you represent a commission or rights holder and would like something removed, write to {mail} and we will act on it promptly.</p>
      </Section>

      <Section id="delete" title="Deleting your account">
        <p>In the app: Settings → Delete my account. This permanently removes your account, goals, check-ins, preparation data and posts.</p>
        <p>Can&apos;t sign in? Email {mail} from the address you signed up with, with the subject &ldquo;Delete my account&rdquo;. We delete it within 7 days and confirm by email.</p>
      </Section>

      <Section id="delete-data" title="Deleting some of your data">
        <p>You can delete things one at a time and keep your account. Tap the &ldquo;&middot;&middot;&middot;&rdquo; menu next to the item, then Delete:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>a goal, with all of its check-ins, or a single check-in</li>
          <li>your posts and comments in the feed and in communities</li>
          <li>to-dos, focus sessions, mistakes, mock test scores, answer logs and subtopics you added</li>
        </ul>
        <p>Each item is removed straight away. To have other data deleted, such as your exam ticks and study history, email {mail} from the address you signed up with, saying what to delete. We delete it within 7 days and confirm by email.</p>
      </Section>

      <Section title="Privacy">
        <p>What we store, why, and who processes it: <Link href="/privacy" className="font-medium text-slate-900 underline underline-offset-2 dark:text-white">Privacy policy</Link>.</p>
      </Section>

      <p className="border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800">{APP_NAME}, version {APP_VERSION}. Free for students, with no ads.</p>
    </div>
  </main>
}
