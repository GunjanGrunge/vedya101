import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import '../styles/globals.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import LenisProvider from '../components/LenisProvider'
import OnboardingGate from '../components/OnboardingGate'
import ReduxProvider from '../components/ReduxProvider'

const inter = Inter({ subsets: ['latin'] })
const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'VEDYA – AI-Powered Education Platform',
  description: 'Personalized learning experiences powered by advanced AI technology. Built by VAYU Innovations.',
  keywords: ['education', 'ai', 'learning', 'personalized', 'vayu innovations'],
  authors: [{ name: 'VAYU Innovations' }],
  icons: {
    icon: '/assets/images/Logo.png',
    apple: '/assets/images/Logo.png',
  },
  openGraph: {
    title: 'VEDYA - AI-Powered Education Platform',
    description: 'Personalized learning experiences powered by advanced AI technology.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VEDYA - AI-Powered Education Platform',
    description: 'Personalized learning experiences powered by advanced AI technology.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link
            rel="preconnect"
            href="https://fonts.googleapis.com"
          />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
        </head>
        <body className={`${inter.className} ${poppins.variable} antialiased`}>
          <ReduxProvider>
            <LenisProvider>
              <div className="min-h-screen">
                {children}
                <OnboardingGate />
              </div>
            </LenisProvider>
          </ReduxProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
