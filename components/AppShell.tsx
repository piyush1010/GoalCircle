'use client'

import { usePathname } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import ReminderManager from '@/components/ReminderManager'
import PwaManager from '@/components/PwaManager'
import WelcomeBack from '@/components/WelcomeBack'
import CheerToast from '@/components/CheerToast'
import ConfirmHost from '@/components/ConfirmHost'
import PushPrompt from '@/components/PushPrompt'
import ErrorReporter from '@/components/ErrorReporter'
import PageGuide from '@/components/PageGuide'
import DayEndSync from '@/components/DayEndSync'

// Full-screen flows hide the bar: sign-in, and the exam setup (one question at a time, no distractions).
const NAV_HIDDEN_ROUTES = ['/', '/login', '/signup', '/auth', '/privacy', '/about', '/circles/join', '/prep/start']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNavigation = NAV_HIDDEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  return (
    <>
      <ErrorReporter />
      <PwaManager />
      <ReminderManager />
      <DayEndSync />
      {children}
      {!hideNavigation && <BottomNav />}
      {!hideNavigation && <WelcomeBack />}
      {!hideNavigation && <PageGuide />}
      <CheerToast />
      <ConfirmHost />
      {!hideNavigation && <PushPrompt />}
    </>
  )
}
