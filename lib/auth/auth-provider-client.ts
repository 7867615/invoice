"use client"

import type { AuthProvider } from "@refinedev/core"
import { supabaseBrowserClient } from "@/lib/supabase/client"

export const authProviderClient: AuthProvider = {
  login: async ({ email, password, provider }) => {
    // Handle OAuth login
    if (provider) {
      const { data, error } = await supabaseBrowserClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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
        redirectTo: "/dashboard",
      }
    }

    // Handle email/password login
    if (email && password) {
      const { data, error } = await supabaseBrowserClient.auth.signInWithPassword({
        email,
        password,
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
          redirectTo: "/dashboard",
        }
      }
    }

    // Handle OTP login
    if (email && !password) {
      const { error } = await supabaseBrowserClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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
        redirectTo: `/auth/verify?email=${encodeURIComponent(email)}`,
      }
    }

    return {
      success: false,
      error: {
        name: "LoginError",
        message: "Invalid login credentials",
      },
    }
  },

  logout: async () => {
    const { error } = await supabaseBrowserClient.auth.signOut()

    if (error) {
      return {
        success: false,
        error,
      }
    }

    return {
      success: true,
      redirectTo: "/auth",
    }
  },

  register: async ({ email, password }) => {
    try {
      const { data, error } = await supabaseBrowserClient.auth.signUp({
        email,
        password,
      })

      if (error) {
        return {
          success: false,
          error,
        }
      }

      if (data) {
        return {
          success: true,
          redirectTo: "/dashboard",
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error,
      }
    }

    return {
      success: false,
      error: {
        message: "Register failed",
        name: "Invalid email or password",
      },
    }
  },

  check: async () => {
    const { data, error } = await supabaseBrowserClient.auth.getUser()
    const { user } = data

    if (error) {
      return {
        authenticated: false,
        redirectTo: "/auth",
        logout: true,
      }
    }

    if (user) {
      return {
        authenticated: true,
      }
    }

    return {
      authenticated: false,
      redirectTo: "/auth",
    }
  },

  getPermissions: async () => {
    const user = await supabaseBrowserClient.auth.getUser()
    if (user) {
      return user.data.user?.role
    }
    return null
  },

  getIdentity: async () => {
    const { data } = await supabaseBrowserClient.auth.getUser()
    if (data?.user) {
      return {
        ...data.user,
        name: data.user.email,
      }
    }
    return null
  },

  onError: async (error) => {
    if (error?.code === "PGRST301" || error?.code === 401) {
      return {
        logout: true,
      }
    }
    return { error }
  },
}
