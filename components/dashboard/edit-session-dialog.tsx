"use client"

import type React from "react"

import { useState } from "react"
import { useUpdate, useNotification } from "@refinedev/core"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface EditSessionDialogProps {
  session: {
    id: string
    session_name: string | null
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditSessionDialog({ session, open, onOpenChange }: EditSessionDialogProps) {
  const [sessionName, setSessionName] = useState(session.session_name || "")
  const { mutate: updateSession, isLoading } = useUpdate()
  const { open: openNotification } = useNotification()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!sessionName.trim()) {
      openNotification?.({
        type: "error",
        message: "Session name is required",
        description: "Please enter a valid session name.",
      })
      return
    }

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
          openNotification?.({
            type: "success",
            message: "Session Updated",
            description: "Session name has been updated successfully.",
          })
          onOpenChange(false)
        },
        onError: (error) => {
          openNotification?.({
            type: "error",
            message: "Update Failed",
            description: error.message,
          })
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Session Name</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="session-name" className="text-right">
                Name
              </Label>
              <Input
                id="session-name"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="col-span-3"
                placeholder="Enter session name"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
