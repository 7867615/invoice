"use client"

import { useState } from "react"
import { useGetIdentity, useCreate, useNotification } from "@refinedev/core"
import { InvoiceUpload } from "@/components/dashboard/invoice-upload"

interface UploadedInvoice {
  id: string
  file: File
  status: "uploaded" | "processing" | "completed" | "failed"
  progress: number
  uploadUrl?: string
}

export default function UploadPage() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity()
  const { mutate: createDocument, isLoading: isCreating } = useCreate()
  const { open } = useNotification()
  const [uploadedInvoices, setUploadedInvoices] = useState<UploadedInvoice[]>([])

  const handleFilesChange = (files: UploadedInvoice[]) => {
    setUploadedInvoices(files)
  }

  const uploadToSupabase = async (file: File, userId: string): Promise<string> => {
    const { supabaseBrowserClient } = await import("@/utils/supabase/client")
    const fileExt = file.name.split(".").pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    const { data, error } = await supabaseBrowserClient.storage.from("invoices").upload(fileName, file)

    if (error) {
      throw error
    }

    const {
      data: { publicUrl },
    } = supabaseBrowserClient.storage.from("invoices").getPublicUrl(fileName)

    return publicUrl
  }

  const handleStartInspection = async (files: UploadedInvoice[]) => {
    if (!identity?.id) return

    try {
      // Update files to processing status
      const updatedFiles = files.map((f) => ({
        ...f,
        status: "processing" as const,
      }))
      setUploadedInvoices(updatedFiles)

      // Process each file
      for (const file of files) {
        try {
          // Upload to Supabase storage
          const uploadUrl = await uploadToSupabase(file.file, identity.id)

          // Create document record using Refine's useCreate
          createDocument(
            {
              resource: "documents",
              values: {
                user_id: identity.id,
                filename: file.file.name,
                file_size: file.file.size,
                status: "processing",
                upload_url: uploadUrl,
              },
            },
            {
              onSuccess: () => {
                // Update the file with upload URL
                setUploadedInvoices((prev) => prev.map((f) => (f.id === file.id ? { ...f, uploadUrl } : f)))
              },
              onError: (error) => {
                console.error(`Error creating record for ${file.file.name}:`, error)
                setUploadedInvoices((prev) =>
                  prev.map((f) => (f.id === file.id ? { ...f, status: "failed" as const } : f)),
                )
              },
            },
          )
        } catch (fileError) {
          console.error(`Error processing ${file.file.name}:`, fileError)
          setUploadedInvoices((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: "failed" as const } : f)))
        }
      }

      // Simulate processing completion
      setTimeout(() => {
        const completedFiles = files.map((f) => ({
          ...f,
          status: "completed" as const,
        }))
        setUploadedInvoices(completedFiles)

        open?.({
          type: "success",
          message: "Processing Complete",
          description: "All invoices have been processed successfully.",
        })
      }, 5000)

      open?.({
        type: "info",
        message: "Processing Started",
        description: "Your invoices are being processed. This may take a few minutes.",
      })
    } catch (error: any) {
      open?.({
        type: "error",
        message: "Processing Error",
        description: error.message,
      })
    }
  }

  if (identityLoading) {
    return <div>Loading...</div>
  }

  // Get plan limits from identity metadata
  const planType = identity?.user_metadata?.plan_type || "free"
  const maxFiles = planType === "free" ? 15 : planType === "pro" ? 100 : 500

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Invoices</h1>
        <p className="text-muted-foreground">Upload your invoices for automatic data extraction and processing.</p>
      </div>

      <InvoiceUpload
        maxFiles={maxFiles}
        onFilesChange={handleFilesChange}
        onStartInspection={handleStartInspection}
        uploadedFiles={uploadedInvoices}
        isProcessing={isCreating}
      />
    </div>
  )
}
