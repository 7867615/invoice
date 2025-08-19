"use client"

import { useState, useCallback, useEffect } from "react"
import { useGetIdentity, useOne, useList, useUpdate, useNotification, useCreate } from "@refinedev/core"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useDropzone } from "react-dropzone"
import {
  FolderOpen,
  FileText,
  Download,
  Eye,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  Save,
  X,
  Play,
  ImageIcon,
  FileIcon,
  Zap,
  RotateCcw,
  Loader2,
  Settings,
  TrendingUp,
  Activity,
  Timer,
  Target,
  Sparkles,
  Brain,
  FileCheck,
  AlertTriangle,
  Hourglass,
} from "lucide-react"
import { useParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"

// Track uploading files locally
interface UploadingFile {
  filename: string
  isUploading: boolean
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
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [sessionName, setSessionName] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])

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
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
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
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
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

  // Calculate extraction statistics
  const extractionStats = documents.reduce(
    (acc, doc) => {
      acc.total++
      switch (doc.extraction_status) {
        case "extracted":
          acc.extracted++
          break
        case "extracting":
        case "queued":
          acc.processing++
          break
        case "failed":
          acc.failed++
          break
        case "pending":
          acc.pending++
          break
      }
      acc.totalTokens += doc.tokens_used || 0
      return acc
    },
    { total: 0, extracted: 0, processing: 0, failed: 0, pending: 0, totalTokens: 0 },
  )

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
      if (acceptedFiles.length + documents.length > maxFiles) {
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

      // Add files to uploading state
      const newUploadingFiles = acceptedFiles.map((file) => ({
        filename: file.name,
        isUploading: true,
      }))
      setUploadingFiles((prev) => [...prev, ...newUploadingFiles])

      // Process files one by one
      for (const file of acceptedFiles) {
        try {
          // Upload to Supabase storage first
          const uploadUrl = await uploadToSupabase(file, identity.id)

          // Create document record with uploaded status and URL
          createDocument(
            {
              resource: "documents",
              values: {
                user_id: identity.id,
                session_id: sessionId,
                filename: file.name,
                file_size: file.size,
                status: "uploaded",
                upload_url: uploadUrl,
                extraction_status: session?.auto_extract_on_upload ? "pending" : "pending",
                priority: 0,
              },
            },
            {
              onSuccess: () => {
                console.log(`Successfully uploaded ${file.name}`)
                // Remove from uploading state
                setUploadingFiles((prev) => prev.filter((f) => f.filename !== file.name))
                refetchDocuments()
              },
              onError: (error) => {
                console.error(`Error creating record for ${file.name}:`, error)
                // Remove from uploading state
                setUploadingFiles((prev) => prev.filter((f) => f.filename !== file.name))
                toast({
                  title: "Upload Failed",
                  description: `Failed to upload ${file.name}: ${error.message}`,
                  variant: "destructive",
                })
              },
            },
          )
        } catch (fileError: any) {
          console.error(`Error processing ${file.name}:`, fileError)
          // Remove from uploading state
          setUploadingFiles((prev) => prev.filter((f) => f.filename !== file.name))
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${file.name}: ${fileError.message}`,
            variant: "destructive",
          })
        }
      }

      setIsUploading(false)

      // Refresh documents and session
      setTimeout(() => {
        refetchDocuments()
        refetchSession()
      }, 500)

      toast({
        title: "Upload Started",
        description: `${acceptedFiles.length} file(s) are being uploaded.`,
      })
    },
    [
      maxFiles,
      documents.length,
      identity?.id,
      uploadToSupabase,
      createDocument,
      sessionId,
      refetchDocuments,
      refetchSession,
      session?.auto_extract_on_upload,
    ],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: handleFileSelect })

  const handleStartExtraction = useCallback(async () => {
    if (!identity?.id || !session) return

    // Enable extraction for the session
    updateSession(
      {
        resource: "inspection_sessions",
        id: session.id,
        values: {
          extraction_enabled: true,
          started_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          refetchSession()
          toast({
            title: "Extraction Started",
            description: "Document extraction has been enabled for this session.",
          })
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          })
        },
      },
    )
  }, [identity?.id, session, updateSession, refetchSession])

  const handleManualExtraction = useCallback(
    (documentId: string) => {
      updateDocument(
        {
          resource: "documents",
          id: documentId,
          values: {
            manual_extraction_requested: true,
            extraction_status: "pending",
            priority: 100, // High priority for manual requests
          },
        },
        {
          onSuccess: () => {
            toast({
              title: "Extraction Requested",
              description: "This document has been queued for high-priority extraction.",
            })
            refetchDocuments()
          },
          onError: (error) => {
            toast({
              title: "Request Failed",
              description: error.message,
              variant: "destructive",
            })
          },
        },
      )
    },
    [updateDocument, refetchDocuments],
  )

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
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
      case "processing":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
      case "completed":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "partial":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
    }
  }

  const getExtractionStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
      case "queued":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "extracting":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
      case "extracted":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />
      case "partial":
        return <AlertCircle className="w-4 h-4 text-orange-500" />
      default:
        return <FolderOpen className="w-4 h-4 text-slate-500" />
    }
  }

  const getExtractionIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Hourglass className="w-4 h-4 text-slate-500" />
      case "queued":
        return <Timer className="w-4 h-4 text-blue-500" />
      case "extracting":
        return <Brain className="w-4 h-4 text-amber-500 animate-pulse" />
      case "extracted":
        return <Sparkles className="w-4 h-4 text-emerald-500" />
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      default:
        return <FileCheck className="w-4 h-4 text-slate-500" />
    }
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")) {
      return <ImageIcon className="w-8 h-8 text-emerald-500" />
    } else if (extension === "pdf") {
      return <FileText className="w-8 h-8 text-red-500" />
    } else {
      return <FileIcon className="w-8 h-8 text-blue-500" />
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
      <div className="space-y-6 animate-in fade-in-50 duration-200">
        <div className="space-y-4">
          <div className="h-8 bg-gradient-to-r from-slate-200 to-slate-300 rounded animate-pulse" />
          <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <XCircle className="mx-auto h-16 w-16 text-red-400 mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Session Not Found</h1>
          <p className="text-slate-600 dark:text-slate-400">The requested session could not be found.</p>
        </div>
      </div>
    )
  }

  const extractionProgress = extractionStats.total > 0 ? (extractionStats.extracted / extractionStats.total) * 100 : 0
  const totalFiles = documents.length + uploadingFiles.length

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Session Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700">
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 opacity-50" />
        <div className="relative p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-3 max-w-md">
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
                    className="text-2xl font-bold h-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
                    autoFocus
                  />
                  <Button onClick={handleUpdateSessionName} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingName(false)
                      setSessionName(session.session_name || `Session ${session.id.slice(0, 8)}`)
                    }}
                    className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <h1
                    className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent cursor-pointer hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
                    onClick={() => setIsEditingName(true)}
                    title="Click to edit session name"
                  >
                    {sessionName}
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Click title to edit • Upload and extract data from your documents
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className={`${getSessionStatusColor(session.status)} px-4 py-2 text-sm font-medium`}
              >
                {getStatusIcon(session.status)}
                <span className="ml-2 capitalize">{session.status}</span>
              </Badge>
              <Button
                variant="outline"
                onClick={() => {
                  refetchSession()
                  refetchDocuments()
                }}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Progress Bar for Extraction */}
          {extractionStats.total > 0 && (
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-slate-700/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Extraction Progress</span>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {extractionStats.extracted} of {extractionStats.total} completed
                </span>
              </div>
              <Progress value={extractionProgress} className="h-2" />
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Files</CardTitle>
            <FileText className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{totalFiles}</div>
            <p className="text-xs opacity-80 mt-1">
              {documents.length} uploaded, {uploadingFiles.length} uploading
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Extracted</CardTitle>
            <Sparkles className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{extractionStats.extracted}</div>
            <p className="text-xs opacity-80 mt-1">Successfully processed</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Processing</CardTitle>
            <Brain className="h-5 w-5 opacity-80 animate-pulse" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{extractionStats.processing}</div>
            <p className="text-xs opacity-80 mt-1">Currently extracting</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Tokens Used</CardTitle>
            <Zap className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{extractionStats.totalTokens.toLocaleString()}</div>
            <p className="text-xs opacity-80 mt-1">AI processing tokens</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Upload Section */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-500" />
                Session Files
              </CardTitle>
              <CardDescription className="text-base mt-1">
                Upload and manage documents for AI-powered data extraction.
              </CardDescription>
            </div>
            {!session.extraction_enabled && extractionStats.total > 0 && (
              <Button
                onClick={handleStartExtraction}
                disabled={isUploading || isProcessing}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6 py-2 shadow-lg"
              >
                <Play className="w-4 h-4 mr-2" />
                Enable Extraction
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Show upload button at top if there are files */}
          {totalFiles > 0 && (
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <input {...getInputProps()} style={{ display: "none" }} id="file-upload" />
                <Button
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={isUploading || isProcessing}
                  variant="outline"
                  className="px-6 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? "Uploading..." : "Upload More Files"}
                </Button>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {maxFiles - totalFiles} files remaining ({totalFiles}/{maxFiles} used)
              </div>
            </div>
          )}

          {/* Enhanced Drop Zone */}
          {totalFiles === 0 && (
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-950/50 scale-105"
                  : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              } ${isUploading || isProcessing ? "pointer-events-none opacity-50" : ""}`}
            >
              <input {...getInputProps()} />
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                {isDragActive ? (
                  <div>
                    <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">Drop your files here!</p>
                    <p className="text-slate-600 dark:text-slate-400">Release to upload</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      {isUploading ? "Uploading files..." : "Drop files here or click to browse"}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      {maxFiles - totalFiles} files remaining ({totalFiles}/{maxFiles} used)
                    </p>
                    <div className="flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        PDF
                      </span>
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        Images
                      </span>
                      <span className="flex items-center gap-1">
                        <FileIcon className="w-3 h-3" />
                        Documents
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Files List */}
          {totalFiles > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-blue-500" />
                  Files ({totalFiles})
                </h4>
              </div>

              {/* Show uploading files first */}
              {uploadingFiles.map((file, index) => (
                <div
                  key={`uploading-${index}`}
                  className="flex items-center gap-4 p-4 border border-blue-200 dark:border-blue-800 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50"
                >
                  {getFileIcon(file.filename)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{file.filename}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading to server...
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Uploading</Badge>
                  </div>
                </div>
              ))}

              {/* Show uploaded documents */}
              {documents.map((document: any) => (
                <div
                  key={document.id}
                  className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="relative">
                      {getFileIcon(document.filename)}
                      <div className="absolute -bottom-1 -right-1">{getExtractionIcon(document.extraction_status)}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {document.filename}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {formatFileSize(document.file_size)}
                        </span>
                        {document.extracted_data?.invoice_number && (
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {document.extracted_data.invoice_number}
                          </span>
                        )}
                        {document.extracted_data?.vendor && (
                          <span className="truncate max-w-24">{document.extracted_data.vendor}</span>
                        )}
                        {document.extracted_data?.total_amount && (
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(document.extracted_data.total_amount)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="secondary"
                          className={`${getExtractionStatusColor(document.extraction_status)} text-xs`}
                        >
                          {getExtractionIcon(document.extraction_status)}
                          <span className="ml-1 capitalize">{document.extraction_status}</span>
                        </Badge>
                        {document.tokens_used > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            {document.tokens_used} tokens
                          </Badge>
                        )}
                        {document.manual_extraction_requested && (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs">
                            Priority
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Uploaded: {formatDate(document.created_at)}
                        {document.extraction_completed_at && (
                          <span className="ml-2">• Extracted: {formatDate(document.extraction_completed_at)}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" title="View Details" className="h-8 w-8 p-0">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {document.upload_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View Original"
                          onClick={() => window.open(document.upload_url, "_blank")}
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      {document.extraction_status === "extracted" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Download Data"
                          onClick={() => handleDownloadData(document)}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      {document.extraction_status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Request Priority Extraction"
                          onClick={() => handleManualExtraction(document.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Zap className="w-4 h-4" />
                        </Button>
                      )}
                      {document.extraction_status === "failed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Retry Extraction"
                          onClick={() => handleManualExtraction(document.id)}
                          className="h-8 w-8 p-0"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
