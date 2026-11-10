import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import AppShell from '@/components/AppShell'

// One calm typeface across the app.
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL('https://goalyaar.in'),
  title: 'GoalYaar',
  description: 'A free daily study plan for UPSC, state PCS, SSC, banking, teaching, judiciary and CAT. Tick the syllabus, revise on time, prepare with your batch.',
  applicationName: 'GoalYaar',
  // Link previews on LinkedIn, WhatsApp and X.
  openGraph: {
    title: 'GoalYaar',
    description: 'A free daily study plan for UPSC, state PCS, SSC, banking, teaching, judiciary and CAT. Tick the syllabus, revise on time, prepare with your batch.',
    url: 'https://goalyaar.in',
    siteName: 'GoalYaar',
    type: 'website',
    locale: 'en_IN',
    images: [{ url: '/og-goalyaar.jpg', width: 1200, height: 630, alt: 'GoalYaar: goals become real when you show up' }],
  },
  twitter: { card: 'summary_large_image', title: 'GoalYaar', description: 'A free daily study plan for UPSC, state PCS, SSC, banking, teaching, judiciary and CAT. Tick the syllabus, revise on time, prepare with your batch.', images: ['/og-goalyaar.jpg'] },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GoalYaar',
  },
  icons: {
    icon: [
      { url: '/goalyaar-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/goalyaar-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/goalyaar-icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F7FB' },
    { media: '(prefers-color-scheme: dark)', color: '#07101F' },
  ],
  colorScheme: 'light dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
