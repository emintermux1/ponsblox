import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { SITE_URL, X_HANDLE } from '@/lib/official'
import { Providers } from './providers'
import './globals.css'

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#080c09',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'LONGER',
  description: 'Launch memes with leverage. Pair Pons launches with 3X stock assets on Robinhood Chain.',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
  twitter: {
    card: 'summary',
    site: X_HANDLE,
    creator: X_HANDLE,
    title: 'LONGER',
    description: 'Launch memes with leverage. Pair Pons launches with 3X stock assets on Robinhood Chain.',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col bg-bg font-sans text-paper antialiased">
        <Providers>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
