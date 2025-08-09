import { createBrowserClient } from "@supabase/ssr"
import { SUPABASE_KEY, SUPABASE_URL } from "./constants"
import type { Database } from "./database.types"

export const supabaseBrowserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: "public",
  },
})

// Legacy export for backward compatibility
export const createClient = () => supabaseBrowserClient
export const supabase = supabaseBrowserClient
