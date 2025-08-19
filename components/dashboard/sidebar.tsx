"use client"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { useState, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useLogout, useGetIdentity, useList, useCreate } from "@refinedev/core"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { EditSessionDialog } from "./edit-session-dialog"
import {
  Plus,
  Settings,
  CreditCard,
  FolderOpen,
  Menu,
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Edit,
  ChevronDown,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

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
  const [editingSession, setEditingSession] = useState<{
    id: string
    session_name: string | null
  } | null>(null)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const { mutate: logout, isLoading: isSigningOut } = useLogout()
  const { data: identity } = useGetIdentity()
  const { mutate: createSession } = useCreate()

  // Fetch all sessions for the sidebar
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useList({
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

  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href)
      setIsOpen(false)
    },
    [router],
  )

  const handleCreateNewSession = useCallback(() => {
    if (!identity?.id || isCreatingSession) return

    setIsCreatingSession(true)
    const defaultSessionName = `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`

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
          toast({
            title: "Session Created",
            description: "New inspection session has been created successfully.",
          })
          // Navigate to the new session directly
          router.push(`/dashboard/sessions/${data.data.id}`)
          setIsOpen(false)
          // Refetch sessions to update the sidebar
          refetchSessions()
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message || "Failed to create new session.",
            variant: "destructive",
          })
        },
        onSettled: () => {
          setIsCreatingSession(false)
        },
      },
    )
  }, [identity?.id, isCreatingSession, createSession, router, refetchSessions])

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

  const handleEditSession = useCallback((session: { id: string; session_name: string | null }) => {
    setEditingSession(session)
  }, [])

  const handleEditDialogClose = useCallback(
    (open: boolean) => {
      if (!open) {
        setEditingSession(null)
        // Refetch sessions to get updated data
        refetchSessions()
      }
    },
    [refetchSessions],
  )

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

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    const name = userProfile?.full_name || identity?.name || userProfile?.email || identity?.email || "User"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
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
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleCreateNewSession}
            disabled={isCreatingSession || !identity?.id}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isCreatingSession ? "Creating..." : "New Session"}
          </Button>
        </div>

        {/* Quick Actions */}
        {/*<div className="px-4 pb-4">
          <nav className="space-y-1">
            <button
              onClick={() => handleNavigation("/dashboard/sessions")}
              disabled={isPending}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left",
                pathname === "/dashboard/sessions"
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
                isPending && "opacity-50 cursor-not-allowed",
              )}
            >
              <FileText className="h-4 w-4" />
              All Sessions
            </button>
          </nav>
        </div>*/}

        <Separator className="bg-slate-800" />

        {/* Sessions List */}
        <div className="flex-1 min-h-0 px-4 py-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h3 className="text-sm font-medium text-slate-300">Recent Sessions</h3>
            {sessions.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-white h-6 px-2"
                onClick={() => handleNavigation("/dashboard/sessions")}
              >
                View All
              </Button>
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
                        <div
                          key={session.id}
                          className={cn(
                            "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                            isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                          )}
                        >
                          <button
                            onClick={() => handleNavigation(`/dashboard/sessions/${session.id}`)}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left"
                          >
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
                          </button>

                          {/* Three dots menu - appears on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                  }}
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                  <span className="sr-only">Session options</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleEditSession({
                                      id: session.id,
                                      session_name: session.session_name,
                                    })
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      )
                    })}

                    {sessions.length > 20 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-slate-400 hover:text-white py-2"
                        onClick={() => handleNavigation("/dashboard/sessions")}
                      >
                        View {sessions.length - 20} more sessions...
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <Separator className="bg-slate-800" />

        {/* User Profile with Dropdown */}
        {(userProfile || identity) && (
          <div className="p-4">
            {/*<div className="mb-3 rounded-lg bg-slate-800 p-3">
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
            </div>*/}

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-slate-300 hover:bg-slate-800 hover:text-white p-2 h-auto"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder.svg" alt="Profile" />
                      <AvatarFallback className="bg-slate-700 text-slate-200 text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium truncate max-w-[140px]">
                        {userProfile?.full_name || identity?.name || "User"}
                      </span>
                      <span className="text-xs text-slate-400 truncate max-w-[140px]">
                        {userProfile?.email || identity?.email}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" side="top">
                <DropdownMenuItem onClick={() => handleNavigation("/dashboard/settings")} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigation("/dashboard/plans")} className="cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing & Plans
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isSigningOut ? "Signing out..." : "Sign Out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Edit Session Dialog */}
      {editingSession && (
        <EditSessionDialog session={editingSession} open={!!editingSession} onOpenChange={handleEditDialogClose} />
      )}
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
