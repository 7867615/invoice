"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useLogout, useGetIdentity } from "@refinedev/core"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { LayoutDashboard, Upload, Settings, CreditCard, FileText, Menu, LogOut, User } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Upload Invoices",
    href: "/dashboard/upload",
    icon: Upload,
  },
  {
    name: "Invoice History",
    href: "/dashboard/invoices",
    icon: FileText,
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

  const handleSignOut = async () => {
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
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <h1 className="text-xl font-bold">InvoiceAI</h1>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
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
      </ScrollArea>

      {(userProfile || identity) && (
        <div className="border-t border-slate-800 p-4">
          <div className="mb-4 rounded-lg bg-slate-800 p-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">
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
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <SidebarContent />
      </div>
    </>
  )
}
