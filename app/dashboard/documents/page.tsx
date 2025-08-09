"use client"

import { useGetIdentity } from "@refinedev/core"
import { DocumentTable } from "@/components/dashboard/document-table"

export default function DocumentsPage() {
  const { data: identity, isLoading } = useGetIdentity()

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground">View and manage all your uploaded documents.</p>
      </div>

      <DocumentTable userId={identity?.id} />
    </div>
  )
}
