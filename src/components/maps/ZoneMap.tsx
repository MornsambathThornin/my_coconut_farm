'use client'

import { useEffect, useMemo, useState } from 'react'
import { GoogleMap, InfoWindow, Polygon, useJsApiLoader } from '@react-google-maps/api'

type Props = {
  boundary?: [number, number][]
  overlays?: {
    id: string
    name: string | null
    area_ha: number | null
    tree_count: number | null
    boundary: [number, number][]
  }[]
}

const ZONE_COLORS = [
  { fill: '#f97316', stroke: '#ea580c' },
  { fill: '#3b82f6', stroke: '#2563eb' },
  { fill: '#8b5cf6', stroke: '#7c3aed' },
  { fill: '#10b981', stroke: '#059669' },
  { fill: '#f59e0b', stroke: '#d97706' },
  { fill: '#ec4899', stroke: '#db2777' },
]

export default function ZoneMap({ boundary, overlays }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['drawing', 'geometry'],
  })
  const [map, setMap] = useState<google.maps.Map | null>(null)

  const basePath = useMemo(
    () => (boundary || []).map(([lng, lat]) => ({ lat, lng })),
    [boundary]
  )
  const overlayPaths = useMemo(
    () =>
      (overlays || []).map((zone) =>
        zone.boundary.map(([lng, lat]) => ({ lat, lng }))
      ),
    [overlays]
  )
  const allPaths = useMemo(
    () =>
      [
        ...(basePath.length ? [basePath] : []),
        ...overlayPaths,
      ].filter((p) => p.length),
    [basePath, overlayPaths]
  )
  const [hoveredZone, setHoveredZone] = useState<{
    id: string
    name: string | null
    area_ha: number | null
    tree_count: number | null
    position: { lat: number; lng: number }
  } | null>(null)

  useEffect(() => {
    if (!map || !allPaths.length || !window.google?.maps?.LatLngBounds) return
    const bounds = new google.maps.LatLngBounds()
    allPaths.forEach((shape) =>
      shape.forEach((point) => bounds.extend(point))
    )
    map.fitBounds(bounds)
  }, [map, allPaths])

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-600">
        Failed to load Google Maps.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Loading map...
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      onLoad={(instance) => setMap(instance)}
      options={{
        mapTypeId: 'satellite',
        disableDefaultUI: true,
        zoomControl: true,
        fullscreenControl: true,
        clickableIcons: false,
      }}
    >
      {basePath.length ? (
        <Polygon
          path={basePath}
          options={{
            fillColor: '#22c55e',
            fillOpacity: 0.08,
            strokeColor: '#16a34a',
            strokeWeight: 2,
          }}
        />
      ) : null}
      {overlayPaths.map((shape, index) => {
        const palette = ZONE_COLORS[index % ZONE_COLORS.length]
        const zone = overlays?.[index]
        const center = shape[0]
        return (
          <Polygon
            key={`zone-${index}`}
            path={shape}
            options={{
              fillColor: palette.fill,
              fillOpacity: 0.18,
              strokeColor: palette.stroke,
              strokeWeight: 2,
            }}
            onMouseOver={() => {
              if (!zone || !center) return
              setHoveredZone({
                id: zone.id,
                name: zone.name ?? 'Zone',
                area_ha: zone.area_ha ?? null,
                tree_count: zone.tree_count ?? null,
                position: center,
              })
            }}
            onMouseOut={() => setHoveredZone(null)}
          />
        )
      })}
      {hoveredZone ? (
        <InfoWindow
          position={hoveredZone.position}
          onCloseClick={() => setHoveredZone(null)}
        >
          <div className="text-xs">
            <div className="font-semibold text-slate-900">
              {hoveredZone.name}
            </div>
            <div className="text-slate-600">
              Area: {hoveredZone.area_ha ?? '-'} ha
            </div>
            <div className="text-slate-600">
              Trees: {hoveredZone.tree_count ?? '-'}
            </div>
          </div>
        </InfoWindow>
      ) : null}
    </GoogleMap>
  )
}
