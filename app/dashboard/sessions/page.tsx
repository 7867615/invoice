"use client"

import { useGetIdentity, useList } from "@refinedev/core"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FolderOpen, Calendar, FileText, Eye, Plus } from "lucide-react"
import Link from "next/link"

export default function SessionsPage() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity()

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    refetch,
  } = useList({
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
    queryOptions: {
      enabled: !!identity?.id,
    },
  })

  const sessions = sessionsData?.data || []

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusDescription = (session: any) => {
    if (session.status === "completed") {
      return `${session.processed_files}/${session.total_files} files processed`
    } else if (session.status === "partial") {
      return `${session.processed_files}/${session.total_files} processed, ${session.failed_files} failed`
    } else if (session.status === "failed") {
      return `${session.failed_files}/${session.total_files} files failed`
    } else if (session.status === "processing") {
      return `Processing ${session.total_files} files...`
    } else {
      return `${session.total_files} files uploaded`
    }
  }

  if (identityLoading || sessionsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Inspection Sessions</h1>
          <p className="text-muted-foreground">Loading your sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inspection Sessions</h1>
          <p className="text-muted-foreground">View and manage all your invoice processing sessions.</p>
        </div>
        <Link href="/dashboard/upload">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Session
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sessions</CardTitle>
          <CardDescription>{sessions.length} inspection session(s) in your account</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-xl font-medium">No sessions yet</p>
              <p className="text-gray-500 mb-6">Create your first inspection session to get started</p>
              <Link href="/dashboard/upload">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Session
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session: any) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="font-medium truncate max-w-[200px]">
                            {session.session_name || `Session ${session.id.slice(0, 8)}`}
                          </p>
                          <p className="text-xs text-muted-foreground">ID: {session.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getSessionStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4 text-gray-500" />
                        {session.total_files}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{getStatusDescription(session)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(session.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/sessions/${session.id}`}>
                        <Button variant="ghost" size="sm" title="View Session">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
