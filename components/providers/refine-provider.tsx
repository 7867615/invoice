"use client"

import type React from "react"
import { Refine } from "@refinedev/core"
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar"
import routerProvider from "@refinedev/nextjs-router"
import { authProviderClient } from "@/lib/auth/auth-provider-client"
import { dataProvider } from "@/lib/data/data-provider"

interface RefineProviderProps {
  children: React.ReactNode
}

export function RefineProvider({ children }: RefineProviderProps) {
  return (
    <RefineKbarProvider>
      <Refine
        routerProvider={routerProvider}
        authProvider={authProviderClient}
        dataProvider={dataProvider}
        options={{
          syncWithLocation: true,
          warnWhenUnsavedChanges: true,
          useNewQueryKeys: true,
          projectId: "zeRcLV-V9m3VS-dLxUiK",
        }}
      >
        {children}
        <RefineKbar />
      </Refine>
    </RefineKbarProvider>
  )
}
