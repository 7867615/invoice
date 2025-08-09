"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, X, Play } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface UploadedFile {
  id: string
  file: File
  status: "uploaded" | "processing" | "completed" | "failed"
  progress: number
}

interface DocumentUploadProps {
  maxFiles: number
  onFilesChange: (files: UploadedFile[]) => void
  onRunInspection: (files: UploadedFile[]) => void
}

export function DocumentUpload({ maxFiles, onFilesChange, onRunInspection }: DocumentUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (uploadedFiles.length + acceptedFiles.length > maxFiles) {
        toast({
          title: "Upload limit exceeded",
          description: `You can only upload up to ${maxFiles} documents at a time.`,
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

      const updatedFiles = [...uploadedFiles, ...newFiles]
      setUploadedFiles(updatedFiles)
      onFilesChange(updatedFiles)

      // Simulate file upload progress
      for (const newFile of newFiles) {
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          setUploadedFiles((prev) => prev.map((f) => (f.id === newFile.id ? { ...f, progress } : f)))
        }
      }

      setIsUploading(false)
      toast({
        title: "Files uploaded",
        description: `${acceptedFiles.length} file(s) uploaded successfully.`,
      })
    },
    [uploadedFiles, maxFiles, onFilesChange],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    disabled: isUploading,
  })

  const removeFile = (fileId: string) => {
    const updatedFiles = uploadedFiles.filter((f) => f.id !== fileId)
    setUploadedFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

  const handleRunInspection = () => {
    onRunInspection(uploadedFiles)
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Upload up to {maxFiles} documents for processing. Supported formats: PDF, DOC, DOCX, TXT
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-gray-300 hover:border-gray-400"
            } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-blue-600">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium">Drop files here or click to browse</p>
                <p className="text-sm text-gray-500 mt-2">
                  {uploadedFiles.length}/{maxFiles} files uploaded
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Uploaded Files</CardTitle>
              <CardDescription>{uploadedFiles.length} file(s) ready for processing</CardDescription>
            </div>
            <Button onClick={handleRunInspection} disabled={isUploading}>
              <Play className="w-4 h-4 mr-2" />
              Run Inspection
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file.name}</p>
                    <p className="text-xs text-gray-500">{(file.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    {file.progress < 100 && file.status === "uploaded" && (
                      <Progress value={file.progress} className="mt-2" />
                    )}
                  </div>
                  <Badge className={getStatusColor(file.status)}>{file.status}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
