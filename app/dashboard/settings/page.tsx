"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/hooks/use-toast"
import { User, Save } from "lucide-react"

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [fullName, setFullName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    getProfile()
  }, [])

  const getProfile = async () => {
    setIsLoading(true)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError) throw userError

      setUser(user)

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileError) throw profileError

        setProfile(profile)
        setFullName(profile.full_name || "")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async () => {
    if (!user) return

    setIsUpdating(true)
    try {
      const { error } = await supabase.from("user_profiles").update({ full_name: fullName }).eq("id", user.id)

      if (error) throw error

      setProfile({ ...profile, full_name: fullName })
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information and profile details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback>
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{profile?.full_name || "No name set"}</h3>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if you need to update your email.
                </p>
              </div>

              <Button onClick={updateProfile} disabled={isUpdating} className="w-fit">
                <Save className="w-4 h-4 mr-2" />
                {isUpdating ? "Updating..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and subscription information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Plan Type</span>
                <span className="capitalize">{profile?.plan_type || "Free"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Tokens Remaining</span>
                <span>{profile?.tokens_remaining || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Documents Uploaded</span>
                <span>{profile?.documents_uploaded || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Member Since</span>
                <span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
