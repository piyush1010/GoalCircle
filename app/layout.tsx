import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'GoalYaar',
  description: 'Track habits, build daily consistency, and stay accountable.',
  applicationName: 'GoalYaar',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GoalYaar',
  },
  icons: {
    icon: [
      { url: '/goalcircle-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/goalcircle-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/goalcircle-icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#07101f' },
  ],
  colorScheme: 'light dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
