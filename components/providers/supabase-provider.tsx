"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { supabaseBrowserClient } from "@/lib/supabase/client"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"

type SupabaseContext = {
  supabase: SupabaseClient<Database>
  user: User | null
  loading: boolean
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabaseBrowserClient.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const {
      data: { subscription },
    } = supabaseBrowserClient.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return <Context.Provider value={{ supabase: supabaseBrowserClient, user, loading }}>{children}</Context.Provider>
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider")
  }
  return context
}
