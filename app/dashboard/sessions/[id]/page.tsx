"use client"

import { useState, useCallback, useEffect } from "react"
import { useGetIdentity, useOne, useList, useUpdate, useNotification, useCreate } from "@refinedev/core"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { useDropzone } from "react-dropzone"
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
  Upload,
  Save,
  X,
  Play,
  ImageIcon,
  FileIcon,
} from "lucide-react"
import { useParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface UploadedFile {
  id: string
  file: File
  status: "uploaded" | "processing" | "completed" | "failed"
  progress: number
  uploadUrl?: string
}

export default function SessionDetailPage() {
  const params = useParams()
  const sessionId = params.id as string
  const { data: identity } = useGetIdentity()
  const { open } = useNotification()
  const { mutate: updateDocument } = useUpdate()
  const { mutate: updateSession } = useUpdate()
  const { mutate: createDocument } = useCreate()

  // Local state for uploads
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [sessionName, setSessionName] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)

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

  // Set session name when session loads
  useEffect(() => {
    if (session && !sessionName) {
      setSessionName(session.session_name || `Session ${session.id.slice(0, 8)}`)
    }
  }, [session, sessionName])

  // Get plan limits from identity metadata
  const planType = identity?.user_metadata?.plan_type || "free"
  const maxFiles = planType === "free" ? 15 : planType === "pro" ? 100 : 500

  // Upload functionality
  const uploadToSupabase = useCallback(
    async (file: File, userId: string): Promise<string> => {
      const { supabaseBrowserClient } = await import("@/utils/supabase/client")
      const fileExt = file.name.split(".").pop()
      const fileName = `${userId}/${sessionId}/${Date.now()}.${fileExt}`

      const { data, error } = await supabaseBrowserClient.storage.from("invoices").upload(fileName, file)

      if (error) {
        throw error
      }

      const {
        data: { publicUrl },
      } = supabaseBrowserClient.storage.from("invoices").getPublicUrl(fileName)

      return publicUrl
    },
    [sessionId],
  )

  const handleFileSelect = useCallback(
    async (acceptedFiles: File[]) => {
      if (uploadedFiles.length + acceptedFiles.length + documents.length > maxFiles) {
        toast({
          title: "Upload Limit Exceeded",
          description: `You can only upload up to ${maxFiles} files in total.`,
          variant: "destructive",
        })
        return
      }

      if (!identity?.id) {
        toast({
          title: "Authentication Error",
          description: "Please log in to upload files.",
          variant: "destructive",
        })
        return
      }

      setIsUploading(true)

      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        status: "uploaded",
        progress: 0,
      }))

      setUploadedFiles((prev) => [...prev, ...newFiles])

      // Upload files directly to Supabase and create document records
      for (const newFile of newFiles) {
        try {
          // Show upload progress
          for (let progress = 0; progress <= 90; progress += 10) {
            await new Promise((resolve) => setTimeout(resolve, 50))
            setUploadedFiles((prev) => prev.map((f) => (f.id === newFile.id ? { ...f, progress } : f)))
          }

          // Upload to Supabase storage
          const uploadUrl = await uploadToSupabase(newFile.file, identity.id)

          // Create document record
          createDocument(
            {
              resource: "documents",
              values: {
                user_id: identity.id,
                session_id: sessionId,
                filename: newFile.file.name,
                file_size: newFile.file.size,
                status: "uploaded",
                upload_url: uploadUrl,
              },
            },
            {
              onSuccess: () => {
                // Complete the progress and mark as uploaded
                setUploadedFiles((prev) =>
                  prev.map((f) => (f.id === newFile.id ? { ...f, progress: 100, uploadUrl, status: "uploaded" } : f)),
                )
              },
              onError: (error) => {
                console.error(`Error creating record for ${newFile.file.name}:`, error)
                setUploadedFiles((prev) => prev.map((f) => (f.id === newFile.id ? { ...f, status: "failed" } : f)))
                toast({
                  title: "Upload Failed",
                  description: `Failed to upload ${newFile.file.name}: ${error.message}`,
                  variant: "destructive",
                })
              },
            },
          )
        } catch (fileError: any) {
          console.error(`Error processing ${newFile.file.name}:`, fileError)
          setUploadedFiles((prev) => prev.map((f) => (f.id === newFile.id ? { ...f, status: "failed" } : f)))
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${newFile.file.name}: ${fileError.message}`,
            variant: "destructive",
          })
        }
      }

      setIsUploading(false)

      // Refresh documents to show newly uploaded files
      setTimeout(() => {
        refetchDocuments()
        refetchSession()
      }, 1000)

      toast({
        title: "Files Uploaded",
        description: `${acceptedFiles.length} file(s) uploaded successfully to session.`,
      })
    },
    [
      uploadedFiles,
      maxFiles,
      documents.length,
      identity?.id,
      uploadToSupabase,
      createDocument,
      sessionId,
      refetchDocuments,
      refetchSession,
    ],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: handleFileSelect })

  const removeFile = useCallback(
    (fileId: string) => {
      const updatedFiles = uploadedFiles.filter((f) => f.id !== fileId)
      setUploadedFiles(updatedFiles)
    },
    [uploadedFiles],
  )

  const handleStartInspection = useCallback(async () => {
    if (!identity?.id || !session) return

    // Get all uploaded documents that haven't been processed yet
    const unprocessedDocs = documents.filter((doc) => doc.status === "uploaded")

    if (unprocessedDocs.length === 0 && uploadedFiles.length === 0) {
      toast({
        title: "No Files to Process",
        description: "Please upload files before starting inspection.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      // Update session status to processing
      updateSession(
        {
          resource: "inspection_sessions",
          id: session.id,
          values: {
            status: "processing",
            started_at: new Date().toISOString(),
          },
        },
        {
          onSuccess: () => {
            refetchSession()
          },
        },
      )

      // Update all uploaded documents to processing status
      for (const doc of unprocessedDocs) {
        updateDocument(
          {
            resource: "documents",
            id: doc.id,
            values: {
              status: "processing",
            },
          },
          {
            onSuccess: () => {
              console.log(`Started processing ${doc.filename}`)
            },
            onError: (error) => {
              console.error(`Error updating ${doc.filename}:`, error)
            },
          },
        )
      }

      // Update any pending uploaded files to processing
      if (uploadedFiles.length > 0) {
        const updatedFiles = uploadedFiles.map((f) => ({
          ...f,
          status: "processing" as const,
        }))
        setUploadedFiles(updatedFiles)
      }

      // Simulate processing completion (replace with actual processing logic)
      setTimeout(() => {
        // Update documents to completed status
        unprocessedDocs.forEach((doc) => {
          updateDocument(
            {
              resource: "documents",
              id: doc.id,
              values: {
                status: "completed",
                extracted_data: {
                  invoice_number: `INV-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                  vendor: `Vendor ${Math.floor(Math.random() * 100)}`,
                  total_amount: (Math.random() * 1000 + 100).toFixed(2),
                  date: new Date().toISOString().split("T")[0],
                  processed_at: new Date().toISOString(),
                },
              },
            },
            {
              onSuccess: () => {
                console.log(`Completed processing ${doc.filename}`)
              },
            },
          )
        })

        // Clear uploaded files after processing
        setUploadedFiles([])

        // Refresh data
        setTimeout(() => {
          refetchDocuments()
          refetchSession()
        }, 1000)

        toast({
          title: "Inspection Complete",
          description: "All files have been processed successfully.",
        })
      }, 5000)

      toast({
        title: "Inspection Started",
        description: "Your files are being processed. This may take a few minutes.",
      })
    } catch (error: any) {
      toast({
        title: "Processing Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }, [identity?.id, session, documents, uploadedFiles, updateSession, updateDocument, refetchSession, refetchDocuments])

  const handleUpdateSessionName = useCallback(() => {
    if (!session || !sessionName.trim()) return

    updateSession(
      {
        resource: "inspection_sessions",
        id: session.id,
        values: {
          session_name: sessionName.trim(),
        },
      },
      {
        onSuccess: () => {
          setIsEditingName(false)
          refetchSession()
          toast({
            title: "Session Updated",
            description: "Session name has been updated successfully.",
          })
        },
        onError: (error) => {
          toast({
            title: "Update Failed",
            description: error.message,
            variant: "destructive",
          })
        },
      },
    )
  }, [session, sessionName, updateSession, refetchSession])

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
          toast({
            title: "Reprocessing Started",
            description: "The document is being reprocessed.",
          })
          refetchDocuments()
          refetchSession()
        },
        onError: (error) => {
          toast({
            title: "Reprocessing Failed",
            description: error.message,
            variant: "destructive",
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

    toast({
      title: "Download Started",
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

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")) {
      return <ImageIcon className="w-8 h-8 text-green-500" />
    } else if (extension === "pdf") {
      return <FileText className="w-8 h-8 text-red-500" />
    } else {
      return <FileIcon className="w-8 h-8 text-blue-500" />
    }
  }

  const getUploadStatusColor = (status: string) => {
    switch (status) {
      case "uploaded":
        return "bg-blue-500"
      case "processing":
        return "bg-yellow-500"
      case "completed":
        return "bg-green-500"
      case "failed":
        return "bg-red-500"
      default:
        return "bg-gray-500"
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
  const totalFiles = documents.length + uploadedFiles.length

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-2 max-w-md">
              <Input
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUpdateSessionName()
                  } else if (e.key === "Escape") {
                    setIsEditingName(false)
                    setSessionName(session.session_name || `Session ${session.id.slice(0, 8)}`)
                  }
                }}
                className="text-2xl font-bold h-12"
                autoFocus
              />
              <Button onClick={handleUpdateSessionName} size="sm">
                <Save className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingName(false)
                  setSessionName(session.session_name || `Session ${session.id.slice(0, 8)}`)
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div>
              <h1
                className="text-3xl font-bold cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => setIsEditingName(true)}
                title="Click to edit session name"
              >
                {sessionName}
              </h1>
              <p className="text-muted-foreground">Click title to edit • Upload and process your documents</p>
            </div>
          )}
        </div>
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
            <div className="text-2xl font-bold">{totalFiles}</div>
            <p className="text-xs text-muted-foreground">
              {documents.length} processed, {uploadedFiles.length} pending
            </p>
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

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Upload documents to this session. Files will be uploaded immediately when selected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show upload button if there are already files, otherwise show drop zone */}
          {documents.length > 0 || uploadedFiles.length > 0 ? (
            <div className="text-center py-6">
              <input {...getInputProps()} style={{ display: "none" }} id="file-upload" />
              <Button
                onClick={() => document.getElementById("file-upload")?.click()}
                disabled={isUploading || isProcessing}
                variant="outline"
                size="lg"
                className="px-8"
              >
                <Upload className="w-5 h-5 mr-2" />
                {isUploading ? "Uploading..." : "Upload More Files"}
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                {maxFiles - totalFiles} files remaining ({totalFiles}/{maxFiles} used)
              </p>
            </div>
          ) : (
            /* Drop Zone - only show when no files are uploaded */
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-gray-300 hover:border-gray-400"
              } ${isUploading || isProcessing ? "pointer-events-none opacity-50" : ""}`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-lg text-blue-600">Drop your files here...</p>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2">
                    {isUploading ? "Uploading files..." : "Drop files here or click to browse"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {maxFiles - totalFiles} files remaining ({totalFiles}/{maxFiles} used)
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Supported: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, WEBP</p>
                </div>
              )}
            </div>
          )}

          {/* Start Inspection Button */}
          {(documents.some((doc) => doc.status === "uploaded") || uploadedFiles.length > 0) && (
            <div className="flex justify-center pt-4">
              <Button onClick={handleStartInspection} disabled={isUploading || isProcessing} size="lg" className="px-8">
                <Play className="w-5 h-5 mr-2" />
                {isProcessing ? "Processing..." : "Start Inspection"}
              </Button>
            </div>
          )}

          {/* Uploaded Files List - Show only if there are pending files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Recently Uploaded ({uploadedFiles.length})</h4>
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-4 border rounded-lg">
                  {getFileIcon(file.file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.file.size)} • {file.file.type || "Unknown type"}
                    </p>
                    {file.progress < 100 && file.status === "uploaded" && (
                      <Progress value={file.progress} className="mt-2" />
                    )}
                    {file.status === "processing" && (
                      <div className="mt-2">
                        <Progress value={Math.random() * 100} className="animate-pulse" />
                        <p className="text-xs text-yellow-600 mt-1">Processing document data...</p>
                      </div>
                    )}
                  </div>
                  <Badge className={getUploadStatusColor(file.status)}>
                    {file.status === "processing" ? "Processing..." : file.status}
                  </Badge>
                  {file.status !== "processing" && !isProcessing && file.status !== "completed" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      disabled={file.status === "processing"}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Progress */}
      {documents.length > 0 && (
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
      )}

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Processed Documents</CardTitle>
          <CardDescription>All files that have been processed in this session</CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-xl font-medium">No processed documents yet</p>
              <p className="text-gray-500 mb-6">Upload files above to get started with processing</p>
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
                  <TableHead>Processed</TableHead>
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
