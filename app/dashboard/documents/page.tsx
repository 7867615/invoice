"use client"

import { useState, useEffect } from "react"
import { redirect } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { DocumentTable } from "@/components/dashboard/document-table"

export default function DocumentsPage() {
  const [user, setUser] = useState<any>(null)

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
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground">View and manage all your uploaded documents.</p>
      </div>

      <DocumentTable userId={user.id} />
    </div>
  )
}
