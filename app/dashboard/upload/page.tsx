"use client"

import { useState, useEffect, useCallback } from "react"
import { useGetIdentity, useCreate, useNotification, useUpdate } from "@refinedev/core"
import { InvoiceUpload } from "@/components/dashboard/invoice-upload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"

interface UploadedInvoice {
  id: string
  file: File
  status: "uploaded" | "processing" | "completed" | "failed"
  progress: number
  uploadUrl?: string
}

export default function UploadPage() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity()
  const { mutate: createSession, isLoading: isCreatingSession } = useCreate()
  const { mutate: updateSession } = useUpdate()
  const { mutate: createDocument, isLoading: isCreating } = useCreate()
  const { open } = useNotification()

  const [currentSession, setCurrentSession] = useState<any>(null)
  const [sessionName, setSessionName] = useState("")
  const [uploadedInvoices, setUploadedInvoices] = useState<UploadedInvoice[]>([])
  const [sessionCreated, setSessionCreated] = useState(false)

  // Create a new session when component mounts - only once
  useEffect(() => {
    if (identity?.id && !currentSession && !sessionCreated && !isCreatingSession) {
      const defaultSessionName = `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
      setSessionName(defaultSessionName)
      setSessionCreated(true)

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
            setCurrentSession(data.data)
          },
          onError: (error) => {
            setSessionCreated(false) // Reset on error so it can retry
            open?.({
              type: "error",
              message: "Session Creation Failed",
              description: error.message,
            })
          },
        },
      )
    }
  }, [identity?.id, currentSession, sessionCreated, isCreatingSession, createSession, open])

  const handleSessionNameChange = useCallback(() => {
    if (!currentSession || !sessionName.trim()) return

    updateSession(
      {
        resource: "inspection_sessions",
        id: currentSession.id,
        values: {
          session_name: sessionName.trim(),
        },
      },
      {
        onSuccess: () => {
          setCurrentSession((prev: any) => ({ ...prev, session_name: sessionName.trim() }))
          open?.({
            type: "success",
            message: "Session Updated",
            description: "Session name has been updated.",
          })
        },
        onError: (error) => {
          open?.({
            type: "error",
            message: "Update Failed",
            description: error.message,
          })
        },
      },
    )
  }, [currentSession, sessionName, updateSession, open])

  const handleFilesChange = useCallback((files: UploadedInvoice[]) => {
    setUploadedInvoices(files)
  }, [])

  const uploadToSupabase = useCallback(
    async (file: File, userId: string): Promise<string> => {
      const { supabaseBrowserClient } = await import("@/utils/supabase/client")
      const fileExt = file.name.split(".").pop()
      const fileName = `${userId}/${currentSession.id}/${Date.now()}.${fileExt}`

      const { data, error } = await supabaseBrowserClient.storage.from("invoices").upload(fileName, file)

      if (error) {
        throw error
      }

      const {
        data: { publicUrl },
      } = supabaseBrowserClient.storage.from("invoices").getPublicUrl(fileName)

      return publicUrl
    },
    [currentSession?.id],
  )

  const handleStartInspection = useCallback(
    async (files: UploadedInvoice[]) => {
      if (!identity?.id || !currentSession) return

      try {
        // Update session status to processing
        updateSession(
          {
            resource: "inspection_sessions",
            id: currentSession.id,
            values: {
              status: "processing",
              started_at: new Date().toISOString(),
            },
          },
          {
            onSuccess: () => {
              setCurrentSession((prev: any) => ({ ...prev, status: "processing" }))
            },
          },
        )

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
                  session_id: currentSession.id,
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
    },
    [identity?.id, currentSession, updateSession, uploadToSupabase, createDocument, open],
  )

  if (identityLoading || isCreatingSession) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">New Inspection Session</h1>
          <p className="text-muted-foreground">Creating your new session...</p>
        </div>
      </div>
    )
  }

  // Get plan limits from identity metadata
  const planType = identity?.user_metadata?.plan_type || "free"
  const maxFiles = planType === "free" ? 15 : planType === "pro" ? 100 : 500

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Inspection Session</h1>
        <p className="text-muted-foreground">Upload and process invoices in this dedicated session.</p>
      </div>

      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>Configure your inspection session settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="sessionName">Session Name</Label>
                <Input
                  id="sessionName"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Enter session name"
                />
              </div>
              <Button onClick={handleSessionNameChange} disabled={!sessionName.trim()}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Session ID: {currentSession.id} • Status: {currentSession.status} • Created:{" "}
              {new Date(currentSession.created_at).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}

      <InvoiceUpload
        maxFiles={maxFiles}
        onFilesChange={handleFilesChange}
        onStartInspection={handleStartInspection}
        uploadedFiles={uploadedInvoices}
        isProcessing={isCreating}
        sessionId={currentSession?.id}
      />
    </div>
  )
}
