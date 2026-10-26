'use client'

import { usePathname } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import ReminderManager from '@/components/ReminderManager'
import PwaManager from '@/components/PwaManager'
import WelcomeBack from '@/components/WelcomeBack'
import GoalieCheer from '@/components/GoalieCheer'
import GoalieBuddy from '@/components/GoalieBuddy'
import ConfirmHost from '@/components/ConfirmHost'

const NAV_HIDDEN_ROUTES = ['/', '/login', '/signup', '/auth', '/privacy']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNavigation = NAV_HIDDEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  return (
    <>
      <PwaManager />
      <ReminderManager />
      {children}
      {!hideNavigation && <BottomNav />}
      {!hideNavigation && <WelcomeBack />}
      {!hideNavigation && <GoalieBuddy />}
      <GoalieCheer />
      <ConfirmHost />
    </>
  )
}
