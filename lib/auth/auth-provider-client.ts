"use client";

import type { AuthProvider } from "@refinedev/core";
import { supabaseBrowserClient } from "@/lib/supabase/client";

export const authProviderClient: AuthProvider = {
  login: async ({ email, provider, providerName }) => {
    // Handle OAuth login (Google, Microsoft, Apple)
    if (provider || providerName) {
      const oauthProvider = provider || providerName;

      const { data, error } = await supabaseBrowserClient.auth.signInWithOAuth({
        provider: oauthProvider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        return {
          success: false,
          error,
        };
      }

      return {
        success: true,
        redirectTo: "/dashboard",
      };
    }

    // Handle OTP login (email only)
    if (email) {
      const { error } = await supabaseBrowserClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: undefined,
          shouldCreateUser: true,
        },
      });

      if (error) {
        return {
          success: false,
          error,
        };
      }

      return {
        success: true,
        redirectTo: `/auth/verify?email=${encodeURIComponent(email)}`,
      };
    }

    // Default error case
    return {
      success: false,
      error: {
        name: "LoginError",
        message: "Email is required for authentication",
      },
    };
  },

  // Custom method for OTP verification
  verifyOtp: async ({ email, token }: { email: string; token: string }) => {
    try {
      const { data, error } = await supabaseBrowserClient.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (error) {
        return {
          success: false,
          error,
        };
      }

      if (data?.session) {
        await supabaseBrowserClient.auth.setSession(data.session);
        return {
          success: true,
          redirectTo: "/dashboard",
        };
      }

      return {
        success: false,
        error: {
          name: "VerificationError",
          message: "Invalid verification code",
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error,
      };
    }
  },

  logout: async () => {
    const { error } = await supabaseBrowserClient.auth.signOut();

    if (error) {
      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
      redirectTo: "/auth",
    };
  },

  register: async ({ email }) => {
    try {
      // For registration, we'll use OTP as well (no password)
      const { error } = await supabaseBrowserClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return {
          success: false,
          error,
        };
      }

      return {
        success: true,
        redirectTo: `/auth/verify?email=${encodeURIComponent(email)}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error,
      };
    }
  },

  check: async () => {
    const { data, error } = await supabaseBrowserClient.auth.getUser();
    const { user } = data;

    if (error) {
      return {
        authenticated: false,
        redirectTo: "/auth",
        logout: true,
      };
    }

    if (user) {
      return {
        authenticated: true,
      };
    }

    return {
      authenticated: false,
      redirectTo: "/auth",
    };
  },

  getPermissions: async () => {
    const user = await supabaseBrowserClient.auth.getUser();
    if (user) {
      return user.data.user?.role;
    }
    return null;
  },

  getIdentity: async () => {
    const { data } = await supabaseBrowserClient.auth.getUser();
    if (data?.user) {
      return {
        ...data.user,
        name: data.user.email,
      };
    }
    return null;
  },

  onError: async (error) => {
    if (error?.code === "PGRST301" || error?.code === 401) {
      return {
        logout: true,
      };
    }
    return { error };
  },
};
