"use client"
import { useEffect, useState, useCallback } from 'react'

type Farm = {
  id?: string
  name: string
  location?: string | null
  total_area_ha?: number | null
  boundary?: [number, number][] | null
  notes?: string | null
}

export function useFarms() {
  const [farms, setFarms] = useState<Farm[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadFarms = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/farms')
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Unable to load farms')
      }
      setFarms((data as Farm[]) || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error('Unable to load farms'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFarms()
  }, [loadFarms])

  const create = useCallback(async (payload: Farm) => {
    // Optimistic create: insert a temporary farm into state immediately,
    // then replace with server result or rollback on error.
    setLoading(true)
    const tempId = `temp-${Date.now()}`
    const tempFarm: Farm = {
      id: tempId,
      name: payload.name,
      location: payload.location ?? null,
      total_area_ha: payload.total_area_ha ?? null,
      boundary: payload.boundary ?? null,
      notes: payload.notes ?? null,
    }
    setFarms(prev => (prev ? [tempFarm, ...prev] : [tempFarm]))
    try {
      // Call server-side create endpoint so RLS and validation happen server-side.
      const res = await fetch('/api/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const createdResponse = await res.json()
      if (!res.ok) {
        throw new Error((createdResponse as { error?: string })?.error || 'Create failed')
      }
      const created = createdResponse as Farm
      // replace temp with created
      setFarms(prev => (prev ? prev.map(f => (f.id === tempId ? created : f)) : prev))
      return created
    } catch (err: unknown) {
      // rollback: remove temp farm
      setFarms(prev => (prev ? prev.filter(f => f.id !== tempId) : prev))
      setError(err instanceof Error ? err : new Error('Unable to create farm'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const update = useCallback(async (id: string, payload: Partial<Farm>) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/farms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const updated = await res.json()
      if (!res.ok) {
        throw new Error(updated?.error || 'Update failed')
      }
      setFarms(prev => (prev ? prev.map(f => (f.id === id ? (updated as Farm) : f)) : prev))
      return updated
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error('Unable to update farm'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    // Optimistic remove: remove from UI immediately, call server, rollback on error
    setLoading(true)
    const prevState = farms
    setFarms(prev => (prev ? prev.filter(f => f.id !== id) : prev))
    try {
      const res = await fetch(`/api/farms/${id}`, { method: 'DELETE' })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload?.error || 'Delete failed')
      }
      return payload
    } catch (err: unknown) {
      // rollback
      setFarms(prevState)
      setError(err instanceof Error ? err : new Error('Unable to delete farm'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [farms])

  return {
    farms,
    loading,
    error,
    refetch: loadFarms,
    create,
    update,
    remove,
  }
}

export default useFarms
