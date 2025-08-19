"use client"

import { useEffect } from "react"
import { useGetIdentity, useList, useCreate } from "@refinedev/core"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity()
  const router = useRouter()
  const { mutate: createSession } = useCreate()

  // Fetch the latest session
  const { data: sessionsData, isLoading: sessionsLoading } = useList({
    resource: "inspection_sessions",
    filters: [
      {
        field: "user_id",
        operator: "eq",
        value: identity?.id,
      },
    ],
    sorters: [
      {
        field: "created_at",
        order: "desc",
      },
    ],
    pagination: {
      pageSize: 1, // Only get the latest session
    },
    queryOptions: {
      enabled: !!identity?.id,
    },
  })

  const sessions = sessionsData?.data || []
  const latestSession = sessions[0]

  useEffect(() => {
    if (identityLoading || sessionsLoading) return

    if (!identity?.id) {
      router.replace("/auth")
      return
    }

    if (latestSession) {
      // Use replace instead of push to avoid back button issues
      router.replace(`/dashboard/sessions/${latestSession.id}`)
    } else {
      // No sessions exist, create a new one
      const defaultSessionName = `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`

      createSession(
        {
          resource: "inspection_sessions",
          values: {
            user_id: identity.id,
            session_name: defaultSessionName,
            status: "draft",
          },
        },
        {
          onSuccess: (data) => {
            // Use replace instead of push
            router.replace(`/dashboard/sessions/${data.data.id}`)
          },
          onError: (error) => {
            console.error("Failed to create session:", error)
            router.replace("/dashboard/sessions")
          },
        },
      )
    }
  }, [identity?.id, identityLoading, sessionsLoading, latestSession, router, createSession])

  // Show loading state while determining where to redirect
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-sm text-muted-foreground">
          {identityLoading ? "Loading..." : sessionsLoading ? "Loading sessions..." : "Redirecting..."}
        </p>
      </div>
    </div>
  )
}
