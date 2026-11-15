import Link from 'next/link'

/** The two halves of the Communities tab: communities and batches, and the feed of check-ins. */
export default function CommunityTabs({ active }: { active: 'communities' | 'feed' }) {
  const tab = (on: boolean) => `text-[22px] font-bold tracking-tight transition ${on ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`
  return <nav aria-label="Communities and feed" className="flex items-baseline gap-4">
    <Link href="/circles" aria-current={active === 'communities' ? 'page' : undefined} className={tab(active === 'communities')}>Communities</Link>
    <Link href="/feed" aria-current={active === 'feed' ? 'page' : undefined} className={tab(active === 'feed')}>Feed</Link>
  </nav>
}
