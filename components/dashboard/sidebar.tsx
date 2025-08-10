"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useLogout, useGetIdentity, useList } from "@refinedev/core"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  Plus,
  Settings,
  CreditCard,
  FolderOpen,
  Menu,
  LogOut,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

const mainNavigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Plans",
    href: "/dashboard/plans",
    icon: CreditCard,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

interface SidebarProps {
  userProfile?: {
    email: string
    full_name: string | null
    plan_type: string
    tokens_remaining: number
  }
}

export function Sidebar({ userProfile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const { mutate: logout, isLoading: isSigningOut } = useLogout()
  const { data: identity } = useGetIdentity()

  // Fetch all sessions for the sidebar
  const { data: sessionsData, isLoading: sessionsLoading } = useList({
    resource: "inspection_sessions",
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
      staleTime: 30000, // Cache for 30 seconds
      refetchOnWindowFocus: false, // Prevent excessive refetching
    },
  })

  const sessions = sessionsData?.data || []

  const handleSignOut = useCallback(async () => {
    logout(
      {},
      {
        onSuccess: () => {
          toast({
            title: "Signed out",
            description: "You have been signed out successfully.",
          })
          router.push("/auth")
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          })
        },
      },
    )
  }, [logout, router])

  const getSessionStatusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return <Clock className="w-3 h-3 text-yellow-500" />
      case "completed":
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case "failed":
        return <XCircle className="w-3 h-3 text-red-500" />
      case "partial":
        return <AlertCircle className="w-3 h-3 text-orange-500" />
      default:
        return <FolderOpen className="w-3 h-3 text-gray-500" />
    }
  }

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case "processing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "partial":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const truncateSessionName = (name: string, maxLength = 25) => {
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength) + "..."
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Header */}
      <div className="flex h-16 items-center border-b border-slate-800 px-4">
        <h1 className="text-xl font-bold">InvoiceAI</h1>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* New Session Button */}
        <div className="p-4">
          <Link href="/dashboard/upload" onClick={() => setIsOpen(false)}>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </Link>
        </div>

        {/* Main Navigation */}
        <div className="px-4 pb-4">
          <nav className="space-y-1">
            {mainNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <Separator className="bg-slate-800" />

        {/* Sessions List */}
        <div className="flex-1 min-h-0 px-4 py-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h3 className="text-sm font-medium text-slate-300">Recent Sessions</h3>
            {sessions.length > 0 && (
              <Link href="/dashboard/sessions" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white h-6 px-2">
                  View All
                </Button>
              </Link>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="pr-4">
                {sessionsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-slate-800 rounded animate-pulse" />
                    ))}
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderOpen className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                    <p className="text-sm text-slate-400">No sessions yet</p>
                    <p className="text-xs text-slate-500">Create your first session</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {sessions.slice(0, 20).map((session: any) => {
                      const isActive = pathname === `/dashboard/sessions/${session.id}`
                      const sessionName = session.session_name || `Session ${session.id.slice(0, 8)}`

                      return (
                        <Link
                          key={session.id}
                          href={`/dashboard/sessions/${session.id}`}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors group",
                            isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                          )}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getSessionStatusIcon(session.status)}
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium">{truncateSessionName(sessionName)}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-500">{session.total_files} files</span>
                                <Badge
                                  variant="secondary"
                                  className={cn("text-xs px-1.5 py-0", getSessionStatusColor(session.status))}
                                >
                                  {session.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Link>
                      )
                    })}

                    {sessions.length > 20 && (
                      <Link href="/dashboard/sessions" onClick={() => setIsOpen(false)}>
                        <div className="flex items-center justify-center py-2 text-xs text-slate-400 hover:text-white">
                          View {sessions.length - 20} more sessions...
                        </div>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <Separator className="bg-slate-800" />

        {/* User Profile */}
        {(userProfile || identity) && (
          <div className="p-4">
            <div className="mb-3 rounded-lg bg-slate-800 p-3">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium truncate">
                  {userProfile?.full_name || identity?.name || userProfile?.email || identity?.email}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Plan: {userProfile?.plan_type?.charAt(0).toUpperCase() + userProfile?.plan_type?.slice(1) || "Free"}
              </div>
              <div className="text-xs text-slate-400">Tokens: {userProfile?.tokens_remaining || 0}</div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isSigningOut ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-80">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-80 md:flex-col">
        <SidebarContent />
      </div>
    </>
  )
}
