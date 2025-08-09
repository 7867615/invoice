"use client"

import { useState, useEffect } from "react"
import { redirect } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { PlanCard } from "@/components/dashboard/plan-card"
import { toast } from "@/hooks/use-toast"

export default function PlansPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

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

    const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

    setProfile(profile)
  }

  const handleSelectPlan = async (planId: string) => {
    if (!user) return

    try {
      const tokenMap = {
        free: 100,
        pro: 1000,
        premium: 5000,
      }

      const { error } = await supabase
        .from("user_profiles")
        .update({
          plan_type: planId,
          tokens_remaining: tokenMap[planId as keyof typeof tokenMap],
        })
        .eq("id", user.id)

      if (error) throw error

      setProfile((prev) => ({
        ...prev,
        plan_type: planId,
        tokens_remaining: tokenMap[planId as keyof typeof tokenMap],
      }))

      toast({
        title: "Plan updated",
        description: `Successfully upgraded to ${planId} plan.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  if (!profile) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Plans & Pricing</h1>
        <p className="text-muted-foreground">Choose the plan that best fits your document processing needs.</p>
      </div>

      <PlanCard currentPlan={profile.plan_type} onSelectPlan={handleSelectPlan} />
    </div>
  )
}
