import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import SupabaseProvider from "@/components/providers/supabase-provider"
import { RefineProvider } from "@/components/providers/refine-provider"

export const metadata: Metadata = {
  title: "DocInspector - Document Processing Dashboard",
  description: "Advanced document processing and analysis platform",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        <SupabaseProvider>
          <RefineProvider>
            {children}
            <Toaster />
          </RefineProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}
