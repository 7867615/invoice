import type React from "react"
import { requireAuth } from "@/lib/auth/auth-helpers"
import { Sidebar } from "@/components/dashboard/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await requireAuth()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar userProfile={profile} />
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
