"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { useNotification } from "@refinedev/core"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, X, Play, Plus, ImageIcon, FileIcon } from "lucide-react"

interface UploadedInvoice {
  id: string
  file: File
  status: "uploaded" | "processing" | "completed" | "failed"
  progress: number
  uploadUrl?: string
}

interface InvoiceUploadProps {
  maxFiles: number
  onFilesChange: (files: UploadedInvoice[]) => void
  onStartInspection: (files: UploadedInvoice[]) => void
  uploadedFiles: UploadedInvoice[]
  isProcessing?: boolean
}

export function InvoiceUpload({
  maxFiles,
  onFilesChange,
  onStartInspection,
  uploadedFiles,
  isProcessing = false,
}: InvoiceUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const { open } = useNotification()

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (uploadedFiles.length + acceptedFiles.length > maxFiles) {
        open?.({
          type: "error",
          message: "Upload Limit Exceeded",
          description: `You can only upload up to ${maxFiles} invoices at a time.`,
        })
        return
      }

      setIsUploading(true)

      const newFiles: UploadedInvoice[] = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        status: "uploaded",
        progress: 0,
      }))

      const updatedFiles = [...uploadedFiles, ...newFiles]
      onFilesChange(updatedFiles)

      // Simulate file upload progress
      for (const newFile of newFiles) {
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          onFilesChange((prev) => prev.map((f) => (f.id === newFile.id ? { ...f, progress } : f)))
        }
      }

      setIsUploading(false)
      open?.({
        type: "success",
        message: "Files Uploaded",
        description: `${acceptedFiles.length} invoice(s) uploaded successfully.`,
      })
    },
    [uploadedFiles, maxFiles, onFilesChange, open],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
    },
    disabled: isUploading || isProcessing,
  })

  const removeFile = (fileId: string) => {
    const updatedFiles = uploadedFiles.filter((f) => f.id !== fileId)
    onFilesChange(updatedFiles)
  }

  const handleStartInspection = () => {
    onStartInspection(uploadedFiles)
  }

  const getStatusColor = (status: string) => {
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

  return (
    <div className="space-y-6">
      {uploadedFiles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload Invoices</CardTitle>
            <CardDescription>
              Upload up to {maxFiles} invoices for processing. Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF,
              WEBP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-gray-300 hover:border-gray-400"
              } ${isUploading || isProcessing ? "pointer-events-none opacity-50" : ""}`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-16 w-16 text-gray-400 mb-6" />
              {isDragActive ? (
                <p className="text-xl text-blue-600">Drop your invoices here...</p>
              ) : (
                <div>
                  <p className="text-xl font-medium mb-2">Drop invoices here or click to browse</p>
                  <p className="text-sm text-gray-500">Supports PDF, Word documents, text files, and images</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Uploaded Invoices</CardTitle>
              <CardDescription>{uploadedFiles.length} invoice(s) ready for processing</CardDescription>
            </div>
            <div className="flex gap-2">
              <div {...getRootProps()} className="cursor-pointer">
                <input {...getInputProps()} />
                <Button variant="outline" disabled={isUploading || isProcessing}>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload More
                </Button>
              </div>
              <Button
                onClick={handleStartInspection}
                disabled={isUploading || isProcessing || uploadedFiles.some((f) => f.status === "processing")}
              >
                <Play className="w-4 h-4 mr-2" />
                {isProcessing ? "Processing..." : "Start Inspection"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-4 border rounded-lg">
                  {getFileIcon(file.file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB • {file.file.type || "Unknown type"}
                    </p>
                    {file.progress < 100 && file.status === "uploaded" && (
                      <Progress value={file.progress} className="mt-2" />
                    )}
                    {file.status === "processing" && (
                      <div className="mt-2">
                        <Progress value={Math.random() * 100} className="animate-pulse" />
                        <p className="text-xs text-yellow-600 mt-1">Processing invoice data...</p>
                      </div>
                    )}
                  </div>
                  <Badge className={getStatusColor(file.status)}>
                    {file.status === "processing" ? "Processing..." : file.status}
                  </Badge>
                  {file.status !== "processing" && !isProcessing && (
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
