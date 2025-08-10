"use client"

import { useGetIdentity } from "@refinedev/core"
import { InvoiceTable } from "@/components/dashboard/invoice-table"

export default function InvoicesPage() {
  const { data: identity, isLoading } = useGetIdentity()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Invoice History</h1>
          <p className="text-muted-foreground">Loading your invoices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoice History</h1>
        <p className="text-muted-foreground">View and manage all your processed invoices.</p>
      </div>

      <InvoiceTable userId={identity?.id} />
    </div>
  )
}
