'use client'

import { usePathname } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

const NAV_HIDDEN_ROUTES = ['/login', '/signup', '/auth']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNavigation = NAV_HIDDEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  return (
    <>
      {children}
      {!hideNavigation && <BottomNav />}
    </>
  )
}
