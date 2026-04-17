"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import useFarms from "@/lib/hooks/useFarms"

type FarmRecord = {
  id?: string
  name: string
  location?: string | null
  total_area_ha?: number | null
  boundary?: [number, number][] | null
  notes?: string | null
}

type FarmContextValue = {
  farms: FarmRecord[] | null
  loading: boolean
  error: Error | null
  activeFarm: FarmRecord | null
  activeFarmId: string | null
  setActiveFarmId: (id: string | null) => void
  refreshFarms: () => Promise<void>
  createFarm: (payload: FarmRecord) => Promise<FarmRecord>
  updateFarm: (id: string, payload: Partial<FarmRecord>) => Promise<FarmRecord>
  removeFarm: (id: string) => Promise<unknown>
}

const FarmContext = createContext<FarmContextValue | undefined>(undefined)

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const {
    farms,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
  } = useFarms()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [activeFarmId, setActiveFarmId] = useState<string | null>(
    searchParams.get("farm_id") ?? null
  )
  const lastQueryFarmIdRef = useRef<string | null>(searchParams.get("farm_id"))

  useEffect(() => {
    const queryFarmId = searchParams.get("farm_id")
    if (queryFarmId === lastQueryFarmIdRef.current) {
      return
    }
    lastQueryFarmIdRef.current = queryFarmId

    if (queryFarmId && queryFarmId !== activeFarmId) {
      if (!farms || farms.some((farm) => farm.id === queryFarmId)) {
        setActiveFarmId(queryFarmId)
        return
      }
      if (farms.length) {
        setActiveFarmId(farms[0].id ?? null)
        return
      }
      return
    }

    if (!queryFarmId && farms?.length && !activeFarmId) {
      setActiveFarmId(farms[0].id ?? null)
    }
  }, [searchParams, farms, activeFarmId])

  useEffect(() => {
    const currentParam = searchParams.get("farm_id")
    if (activeFarmId && currentParam === activeFarmId) return
    if (!activeFarmId && !currentParam) return

    const nextParams = new URLSearchParams()
    searchParams.forEach((value, key) => {
      if (key === "farm_id") return
      nextParams.append(key, value)
    })

    if (activeFarmId) {
      nextParams.set("farm_id", activeFarmId)
    }

    const queryString = nextParams.toString()
    const target = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(target)
  }, [activeFarmId, pathname, router, searchParams])

  const activeFarm = useMemo(() => {
    if (!farms?.length) return null
    if (!activeFarmId) return farms[0]
    return farms.find((farm) => farm.id === activeFarmId) ?? null
  }, [farms, activeFarmId])

  const value = useMemo<FarmContextValue>(
    () => ({
      farms,
      loading,
      error,
      activeFarm,
      activeFarmId,
      setActiveFarmId,
      refreshFarms: refetch,
      createFarm: create,
      updateFarm: update,
      removeFarm: remove,
    }),
    [farms, loading, error, activeFarm, activeFarmId, refetch, create, update, remove]
  )

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>
}

export function useFarmContext() {
  const context = useContext(FarmContext)
  if (!context) {
    throw new Error("useFarmContext must be used within a FarmProvider")
  }
  return context
}

export type { FarmRecord }
