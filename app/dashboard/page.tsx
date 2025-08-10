"use client"

import { useGetIdentity, useList } from "@refinedev/core"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileText, CreditCard, Upload, Clock, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DashboardPage() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity()

  const { data: invoicesData, isLoading: invoicesLoading } = useList({
    resource: "documents",
    filters: [
      {
        field: "user_id",
        operator: "eq",
        value: identity?.id,
      },
    ],
    sorters: [
      {
        field: "created_at",
        order: "desc",
      },
    ],
    queryOptions: {
      enabled: !!identity?.id,
    },
  })

  const invoices = invoicesData?.data || []

  if (identityLoading || invoicesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Invoice Dashboard</h1>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const stats = {
    totalInvoices: invoices.length,
    processingInvoices: invoices.filter((d) => d.status === "processing").length,
    completedInvoices: invoices.filter((d) => d.status === "completed").length,
    failedInvoices: invoices.filter((d) => d.status === "failed").length,
    tokensUsed: 100 - (identity?.user_metadata?.tokens_remaining || 100),
  }

  const planType = identity?.user_metadata?.plan_type || "free"
  const maxInvoices = planType === "free" ? 15 : planType === "pro" ? 100 : 500
  const recentInvoices = invoices.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{identity?.user_metadata?.full_name ? `, ${identity.user_metadata.full_name}` : ""}! Track your
            invoice processing and manage your uploads.
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button size="lg">
            <Upload className="w-4 h-4 mr-2" />
            Upload Invoices
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">{maxInvoices - stats.totalInvoices} remaining this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processingInvoices}</div>
            <p className="text-xs text-muted-foreground">Currently being processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedInvoices}</div>
            <p className="text-xs text-muted-foreground">Successfully processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tokensUsed}</div>
            <p className="text-xs text-muted-foreground">{identity?.user_metadata?.tokens_remaining || 0} remaining</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Processing Status</CardTitle>
            <CardDescription>Overview of your invoice processing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Monthly Usage</span>
                <span>
                  {stats.totalInvoices}/{maxInvoices}
                </span>
              </div>
              <Progress value={(stats.totalInvoices / maxInvoices) * 100} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Token Usage</span>
                <span>{stats.tokensUsed}/100</span>
              </div>
              <Progress value={(stats.tokensUsed / 100) * 100} />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completedInvoices}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.processingInvoices}</div>
                <div className="text-xs text-muted-foreground">Processing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.failedInvoices}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Your latest uploaded invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {recentInvoices.length > 0 ? (
              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{invoice.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        invoice.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : invoice.status === "processing"
                            ? "bg-yellow-100 text-yellow-800"
                            : invoice.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                ))}
                <div className="pt-2">
                  <Link href="/dashboard/invoices">
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      View All Invoices
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">No invoices yet</p>
                <p className="text-gray-500 mb-4">Upload your first invoice to get started</p>
                <Link href="/dashboard/upload">
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Invoice
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
