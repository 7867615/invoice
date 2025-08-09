"use client"

import { supabaseBrowserClient } from "@/lib/supabase/client"

export async function verifyOTP(email: string, token: string) {
  try {
    const { data, error } = await supabaseBrowserClient.auth.verifyOtp({
      email,
      token,
      type: "email",
    })

    if (error) {
      return {
        success: false,
        error,
      }
    }

    if (data?.session) {
      await supabaseBrowserClient.auth.setSession(data.session)
      return {
        success: true,
        data,
      }
    }

    return {
      success: false,
      error: {
        name: "VerificationError",
        message: "Invalid verification code",
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error,
    }
  }
}

export async function resendOTP(email: string) {
  try {
    const { error } = await supabaseBrowserClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: undefined,
        shouldCreateUser: true,
      },
    })

    if (error) {
      return {
        success: false,
        error,
      }
    }

    return {
      success: true,
    }
  } catch (error: any) {
    return {
      success: false,
      error,
    }
  }
}
