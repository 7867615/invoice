"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { LayoutDashboard, Upload, Settings, CreditCard, FileText, Menu, LogOut, User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Documents",
    href: "/dashboard/documents",
    icon: FileText,
  },
  {
    name: "Upload",
    href: "/dashboard/upload",
    icon: Upload,
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
  const [isSigningOut, setIsSigningOut] = useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      router.push("/auth")
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <h1 className="text-xl font-bold">DocInspector</h1>
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

      {userProfile && (
        <div className="border-t border-slate-800 p-4">
          <div className="mb-4 rounded-lg bg-slate-800 p-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">{userProfile.full_name || userProfile.email}</span>
            </div>
            <div className="text-xs text-slate-400">
              Plan: {userProfile.plan_type.charAt(0).toUpperCase() + userProfile.plan_type.slice(1)}
            </div>
            <div className="text-xs text-slate-400">Tokens: {userProfile.tokens_remaining}</div>
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
