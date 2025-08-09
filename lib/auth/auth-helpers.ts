import { createSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"

export async function getUser(): Promise<User> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth")
  }

  return user
}

export async function getUserProfile(userId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: profile, error } = await supabase.from("user_profiles").select("*").eq("id", userId).single()

  if (error) {
    console.error("Error fetching user profile:", error)
    return null
  }

  return profile
}

export async function requireAuth() {
  const user = await getUser()
  const profile = await getUserProfile(user.id)

  return { user, profile }
}

// Helper function for OTP verification
export async function verifyOTP(email: string, token: string) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  })

  if (error) {
    throw error
  }

  return data
}
