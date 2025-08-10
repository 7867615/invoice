"use client"

import { useEffect } from "react"
import { useGetIdentity, useList, useUpdate, useNotification } from "@refinedev/core"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Download, Eye, ExternalLink, RefreshCw } from "lucide-react"
import { supabaseBrowserClient } from "@/utils/supabase/client"

interface Invoice {
  id: string
  filename: string
  file_size: number
  status: "uploaded" | "processing" | "completed" | "failed"
  created_at: string
  upload_url?: string
  extracted_data?: {
    invoice_number?: string
    total_amount?: string
    date?: string
    vendor?: string
    processed_at?: string
  }
}

interface InvoiceTableProps {
  userId?: string
}

export function InvoiceTable({ userId }: InvoiceTableProps) {
  const { data: identity } = useGetIdentity()
  const { open } = useNotification()
  const { mutate: updateInvoice } = useUpdate()

  const {
    data: invoicesData,
    isLoading,
    refetch,
    isRefetching,
  } = useList({
    resource: "documents",
    filters: [
      {
        field: "user_id",
        operator: "eq",
        value: userId || identity?.id,
      },
    ],
    sorters: [
      {
        field: "created_at",
        order: "desc",
      },
    ],
    queryOptions: {
      enabled: !!(userId || identity?.id),
    },
  })

  const invoices = invoicesData?.data || []

  useEffect(() => {
    if (!userId && !identity?.id) return

    // Set up real-time subscription for invoice updates
    const subscription = supabaseBrowserClient
      .channel("invoices")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "documents",
          filter: `user_id=eq.${userId || identity?.id}`,
        },
        (payload) => {
          console.log("Real-time update:", payload)
          refetch()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId, identity?.id, refetch])

  const handleReprocessInvoice = (invoiceId: string) => {
    updateInvoice(
      {
        resource: "documents",
        id: invoiceId,
        values: {
          status: "processing",
        },
      },
      {
        onSuccess: () => {
          open?.({
            type: "success",
            message: "Reprocessing Started",
            description: "The invoice is being reprocessed.",
          })
        },
        onError: (error) => {
          open?.({
            type: "error",
            message: "Reprocessing Failed",
            description: error.message,
          })
        },
      },
    )
  }

  const handleDownloadData = (invoice: Invoice) => {
    if (!invoice.extracted_data) return

    const dataStr = JSON.stringify(invoice.extracted_data, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${invoice.filename}_extracted_data.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    open?.({
      type: "success",
      message: "Download Started",
      description: "Extracted data is being downloaded.",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "uploaded":
        return "bg-blue-100 text-blue-800"
      case "processing":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + " MB"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatCurrency = (amount: string | undefined) => {
    if (!amount) return "N/A"
    return `$${Number.parseFloat(amount).toFixed(2)}`
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>Loading your invoices...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>{invoices.length} invoice(s) in your account</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-xl font-medium">No invoices yet</p>
            <p className="text-gray-500 mb-6">Upload your first invoice to get started</p>
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              Upload Invoice
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice: Invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="font-medium truncate max-w-[200px]">{invoice.filename}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(invoice.file_size)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{invoice.extracted_data?.invoice_number || "—"}</TableCell>
                  <TableCell>{invoice.extracted_data?.vendor || "—"}</TableCell>
                  <TableCell>{formatCurrency(invoice.extracted_data?.total_amount)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(invoice.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" title="View Details">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {invoice.upload_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View Original"
                          onClick={() => window.open(invoice.upload_url, "_blank")}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      {invoice.status === "completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Download Data"
                          onClick={() => handleDownloadData(invoice)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      {invoice.status === "failed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Reprocess"
                          onClick={() => handleReprocessInvoice(invoice.id)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
