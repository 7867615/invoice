"use client"

import { useGetIdentity, useList } from "@refinedev/core"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileText, CreditCard, Clock, FolderOpen, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DashboardPage() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity()

  // Fetch recent inspection sessions
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
      pageSize: 5,
    },
    queryOptions: {
      enabled: !!identity?.id,
    },
  })

  // Fetch total documents count
  const { data: documentsData, isLoading: documentsLoading } = useList({
    resource: "documents",
    filters: [
      {
        field: "user_id",
        operator: "eq",
        value: identity?.id,
      },
    ],
    queryOptions: {
      enabled: !!identity?.id,
    },
  })

  const sessions = sessionsData?.data || []
  const documents = documentsData?.data || []

  if (identityLoading || sessionsLoading || documentsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Invoice Dashboard</h1>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const stats = {
    totalSessions: sessions.length,
    totalDocuments: documents.length,
    processingSessions: sessions.filter((s) => s.status === "processing").length,
    completedSessions: sessions.filter((s) => s.status === "completed").length,
    tokensUsed: 100 - (identity?.user_metadata?.tokens_remaining || 100),
  }

  const planType = identity?.user_metadata?.plan_type || "free"
  const maxDocuments = planType === "free" ? 15 : planType === "pro" ? 100 : 500

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "processing":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "partial":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoice Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back{identity?.user_metadata?.full_name ? `, ${identity.user_metadata.full_name}` : ""}! Manage your
          invoice processing sessions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">Inspection sessions created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">{maxDocuments - stats.totalDocuments} remaining this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processingSessions}</div>
            <p className="text-xs text-muted-foreground">Currently processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tokensUsed}</div>
            <p className="text-xs text-muted-foreground">{identity?.user_metadata?.tokens_remaining || 0} remaining</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Usage Overview</CardTitle>
            <CardDescription>Your current usage statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Monthly Documents</span>
                <span>
                  {stats.totalDocuments}/{maxDocuments}
                </span>
              </div>
              <Progress value={(stats.totalDocuments / maxDocuments) * 100} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Token Usage</span>
                <span>{stats.tokensUsed}/100</span>
              </div>
              <Progress value={(stats.tokensUsed / 100) * 100} />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completedSessions}</div>
                <div className="text-xs text-muted-foreground">Completed Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.processingSessions}</div>
                <div className="text-xs text-muted-foreground">Active Sessions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Your latest inspection sessions</CardDescription>
            </div>
            <Link href="/dashboard/sessions">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <Link key={session.id} href={`/dashboard/sessions/${session.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <FolderOpen className="h-4 w-4 text-blue-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {session.session_name || `Session ${session.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(session.created_at).toLocaleDateString()}
                          <span>•</span>
                          {session.total_files} files
                        </p>
                      </div>
                      <Badge variant="secondary" className={getSessionStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">No sessions yet</p>
                <p className="text-gray-500 mb-4">Create your first inspection session</p>
                <Link href="/dashboard/upload">
                  <Button>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    New Session
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
