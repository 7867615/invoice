"use client"

import { useGetIdentity, useOne, useList, useUpdate, useNotification } from "@refinedev/core"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  FolderOpen,
  FileText,
  Download,
  Eye,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { useParams } from "next/navigation"

export default function SessionDetailPage() {
  const params = useParams()
  const sessionId = params.id as string
  const { data: identity } = useGetIdentity()
  const { open } = useNotification()
  const { mutate: updateDocument } = useUpdate()

  // Fetch session details
  const {
    data: sessionData,
    isLoading: sessionLoading,
    refetch: refetchSession,
  } = useOne({
    resource: "inspection_sessions",
    id: sessionId,
    queryOptions: {
      enabled: !!sessionId,
    },
  })

  // Fetch documents in this session
  const {
    data: documentsData,
    isLoading: documentsLoading,
    refetch: refetchDocuments,
  } = useList({
    resource: "documents",
    filters: [
      {
        field: "session_id",
        operator: "eq",
        value: sessionId,
      },
    ],
    sorters: [
      {
        field: "created_at",
        order: "asc",
      },
    ],
    queryOptions: {
      enabled: !!sessionId,
    },
  })

  const session = sessionData?.data
  const documents = documentsData?.data || []

  const handleReprocessDocument = (documentId: string) => {
    updateDocument(
      {
        resource: "documents",
        id: documentId,
        values: {
          status: "processing",
        },
      },
      {
        onSuccess: () => {
          open?.({
            type: "success",
            message: "Reprocessing Started",
            description: "The document is being reprocessed.",
          })
          refetchDocuments()
          refetchSession()
        },
        onError: (error) => {
          open?.({
            type: "error",
            message: "Reprocessing Failed",
            description: error.message,
          })
        },
      },
    )
  }

  const handleDownloadData = (document: any) => {
    if (!document.extracted_data) return

    const dataStr = JSON.stringify(document.extracted_data, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${document.filename}_extracted_data.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    open?.({
      type: "success",
      message: "Download Started",
      description: "Extracted data is being downloaded.",
    })
  }

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

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case "uploaded":
        return "bg-blue-100 text-blue-800"
      case "processing":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return <Clock className="w-4 h-4 text-yellow-500" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />
      case "partial":
        return <AlertCircle className="w-4 h-4 text-orange-500" />
      default:
        return <FolderOpen className="w-4 h-4 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + " MB"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatCurrency = (amount: string | undefined) => {
    if (!amount) return "N/A"
    return `$${Number.parseFloat(amount).toFixed(2)}`
  }

  if (sessionLoading || documentsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Session Details</h1>
          <p className="text-muted-foreground">Loading session information...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Session Not Found</h1>
          <p className="text-muted-foreground">The requested session could not be found.</p>
        </div>
      </div>
    )
  }

  const progressPercentage = session.total_files > 0 ? (session.processed_files / session.total_files) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{session.session_name || `Session ${session.id.slice(0, 8)}`}</h1>
          <p className="text-muted-foreground">Detailed view of your inspection session</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              refetchSession()
              refetchDocuments()
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Session Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {getStatusIcon(session.status)}
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className={getSessionStatusColor(session.status)}>
              {session.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session.total_files}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session.processed_files}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session.failed_files}</div>
          </CardContent>
        </Card>
      </div>

      {/* Session Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Progress</CardTitle>
          <CardDescription>Overall progress of this inspection session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>
                {session.processed_files}/{session.total_files} files
              </span>
            </div>
            <Progress value={progressPercentage} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created:</span>
              <div className="font-medium">{formatDate(session.created_at)}</div>
            </div>
            {session.started_at && (
              <div>
                <span className="text-muted-foreground">Started:</span>
                <div className="font-medium">{formatDate(session.started_at)}</div>
              </div>
            )}
            {session.completed_at && (
              <div>
                <span className="text-muted-foreground">Completed:</span>
                <div className="font-medium">{formatDate(session.completed_at)}</div>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Tokens Used:</span>
              <div className="font-medium">{session.total_tokens_used}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documents in Session</CardTitle>
          <CardDescription>All files uploaded and processed in this session</CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-xl font-medium">No documents in this session</p>
              <p className="text-gray-500">Documents will appear here once uploaded</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document: any) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="font-medium truncate max-w-[200px]">{document.filename}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(document.file_size)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{document.extracted_data?.invoice_number || "—"}</TableCell>
                    <TableCell>{document.extracted_data?.vendor || "—"}</TableCell>
                    <TableCell>{formatCurrency(document.extracted_data?.total_amount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getDocumentStatusColor(document.status)}>
                        {document.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(document.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="View Details">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {document.upload_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View Original"
                            onClick={() => window.open(document.upload_url, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        {document.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Download Data"
                            onClick={() => handleDownloadData(document)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {document.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Reprocess"
                            onClick={() => handleReprocessDocument(document.id)}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
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
