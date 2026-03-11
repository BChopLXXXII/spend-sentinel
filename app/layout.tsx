import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SpendSentinel — Token Spend Controller',
  description: 'Stop surprise API bills. Set per-user budgets, get real-time alerts, enforce automatic limits.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <header className="border-b">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <Link href="/" className="text-xl font-bold text-primary">
                    🛡️ SpendSentinel
                  </Link>
                  <nav className="flex gap-6">
                    <Link href="/" className="text-sm hover:text-primary">
                      Dashboard
                    </Link>
                    <Link href="/keys" className="text-sm hover:text-primary">
                      API Keys
                    </Link>
                    <Link href="/settings" className="text-sm hover:text-primary">
                      Settings
                    </Link>
                  </nav>
                </div>
              </div>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
