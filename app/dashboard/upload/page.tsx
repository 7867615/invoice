"use client"

import { useState, useEffect } from "react"
import { redirect } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { DocumentUpload } from "@/components/dashboard/document-upload"
import { toast } from "@/hooks/use-toast"

interface UploadedFile {
  id: string
  file: File
  status: "uploaded" | "processing" | "completed" | "failed"
  progress: number
}

export default function UploadPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      redirect("/auth")
    }

    setUser(user)

    const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

    setProfile(profile)
  }

  const handleFilesChange = (files: UploadedFile[]) => {
    setUploadedFiles(files)
  }

  const handleRunInspection = async (files: UploadedFile[]) => {
    if (!user) return

    try {
      // Update files to processing status
      const updatedFiles = files.map((f) => ({ ...f, status: "processing" as const }))
      setUploadedFiles(updatedFiles)

      // Insert documents into database
      for (const file of files) {
        const { error } = await supabase.from("documents").insert({
          user_id: user.id,
          filename: file.file.name,
          file_size: file.file.size,
          status: "processing",
        })

        if (error) throw error
      }

      // Simulate processing
      setTimeout(async () => {
        const completedFiles = files.map((f) => ({ ...f, status: "completed" as const }))
        setUploadedFiles(completedFiles)

        // Update documents status in database
        for (const file of files) {
          await supabase
            .from("documents")
            .update({ status: "completed" })
            .eq("user_id", user.id)
            .eq("filename", file.file.name)
        }

        toast({
          title: "Processing complete",
          description: "All documents have been processed successfully.",
        })
      }, 5000)

      toast({
        title: "Processing started",
        description: "Your documents are being processed. This may take a few minutes.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  if (!profile) {
    return <div>Loading...</div>
  }

  const maxFiles = profile.plan_type === "free" ? 15 : profile.plan_type === "pro" ? 100 : 500

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Documents</h1>
        <p className="text-muted-foreground">Upload and process your documents with our advanced parsing system.</p>
      </div>

      <DocumentUpload maxFiles={maxFiles} onFilesChange={handleFilesChange} onRunInspection={handleRunInspection} />
    </div>
  )
}
