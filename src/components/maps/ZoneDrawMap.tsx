'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  GoogleMap,
  Polygon,
  DrawingManager,
  Marker,
  useJsApiLoader,
} from '@react-google-maps/api'

type Props = {
  boundary: [number, number][]
  center?: { lat: number; lng: number }
  zoom?: number
  onBoundaryChange: (next: [number, number][]) => void
  onAreaChange?: (areaHa: number) => void
  limitBoundary?: [number, number][]
  occupiedBoundaries?: [number, number][][]
  showLocate?: boolean
}

export default function ZoneDrawMap({
  boundary,
  center,
  zoom = 16,
  onBoundaryChange,
  onAreaChange,
  limitBoundary,
  occupiedBoundaries,
  showLocate = true,
}: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['drawing', 'geometry'],
  })
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const fallbackCenter = useMemo(
    () => center ?? { lat: 11.5564, lng: 104.9282 },
    [center]
  )
  const [mapCenter, setMapCenter] = useState(fallbackCenter)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [boundaryError, setBoundaryError] = useState<string | null>(
    null
  )

  const path = useMemo(
    () => boundary.map(([lng, lat]) => ({ lat, lng })),
    [boundary]
  )
  const limitPath = useMemo(
    () =>
      (limitBoundary || []).map(([lng, lat]) => ({
        lat,
        lng,
      })),
    [limitBoundary]
  )

  useEffect(() => {
    if (!map || !window.google?.maps?.LatLngBounds) return
    const points = path.length ? path : limitPath
    if (!points.length) return
    const bounds = new google.maps.LatLngBounds()
    points.forEach((point) => bounds.extend(point))
    map.fitBounds(bounds)
  }, [map, path, limitPath])

  useEffect(() => {
    if (!onAreaChange || !path.length || !window.google?.maps?.geometry) return
    const areaMeters = window.google.maps.geometry.spherical.computeArea(
      path.map((p) => new window.google.maps.LatLng(p.lat, p.lng))
    )
    onAreaChange(areaMeters / 10000)
  }, [onAreaChange, path])

  useEffect(() => {
    if (!showLocate) return
    let cancelled = false
    if (!navigator.geolocation) {
      setLocateError('Geolocation is not supported in this browser.')
      setMapCenter(fallbackCenter)
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setMapCenter(next)
        setUserLocation(next)
        setLocating(false)
      },
      () => {
        if (cancelled) return
        setLocateError('Location permission denied. Showing Cambodia.')
        setMapCenter(fallbackCenter)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )

    return () => {
      cancelled = true
    }
  }, [fallbackCenter, showLocate])

  const toLatLng = (point: [number, number]) => ({
    lat: point[1],
    lng: point[0],
  })

  const segmentsIntersect = (
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
    c: { lat: number; lng: number },
    d: { lat: number; lng: number }
  ) => {
    const cross = (p: typeof a, q: typeof a, r: typeof a) =>
      (q.lng - p.lng) * (r.lat - p.lat) - (q.lat - p.lat) * (r.lng - p.lng)
    const onSegment = (p: typeof a, q: typeof a, r: typeof a) =>
      Math.min(p.lng, r.lng) <= q.lng &&
      q.lng <= Math.max(p.lng, r.lng) &&
      Math.min(p.lat, r.lat) <= q.lat &&
      q.lat <= Math.max(p.lat, r.lat)

    const d1 = cross(a, b, c)
    const d2 = cross(a, b, d)
    const d3 = cross(c, d, a)
    const d4 = cross(c, d, b)

    if (
      ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
    ) {
      return true
    }
    if (d1 === 0 && onSegment(a, c, b)) return true
    if (d2 === 0 && onSegment(a, d, b)) return true
    if (d3 === 0 && onSegment(c, a, d)) return true
    if (d4 === 0 && onSegment(c, b, d)) return true
    return false
  }

  const polygonIntersects = (
    polyA: { lat: number; lng: number }[],
    polyB: { lat: number; lng: number }[]
  ) => {
    if (polyA.length < 3 || polyB.length < 3) return false

    for (let i = 0; i < polyA.length; i += 1) {
      const a1 = polyA[i]
      const a2 = polyA[(i + 1) % polyA.length]
      for (let j = 0; j < polyB.length; j += 1) {
        const b1 = polyB[j]
        const b2 = polyB[(j + 1) % polyB.length]
        if (segmentsIntersect(a1, a2, b1, b2)) return true
      }
    }

    if (window.google?.maps?.geometry?.poly) {
      const polygonB = new window.google.maps.Polygon({ paths: polyB })
      if (
        window.google.maps.geometry.poly.containsLocation(
          polyA[0],
          polygonB
        )
      ) {
        return true
      }
      const polygonA = new window.google.maps.Polygon({ paths: polyA })
      if (
        window.google.maps.geometry.poly.containsLocation(
          polyB[0],
          polygonA
        )
      ) {
        return true
      }
    }
    return false
  }

  const handlePolygonComplete = (polygon: google.maps.Polygon) => {
    const points = polygon
      .getPath()
      .getArray()
      .map((p) => [p.lng(), p.lat()] as [number, number])

    if (points.length) {
      const first = points[0]
      const last = points[points.length - 1]
      if (first[0] !== last[0] || first[1] !== last[1]) {
        points.push(first)
      }
    }

    if (
      limitPath.length &&
      window.google?.maps?.geometry?.poly
    ) {
      const farmPolygon = new window.google.maps.Polygon({
        paths: limitPath,
      })
      const outside = polygon
        .getPath()
        .getArray()
        .some(
          (p) =>
            !window.google.maps.geometry.poly.containsLocation(
              p,
              farmPolygon
            )
        )
      if (outside) {
        setBoundaryError(
          'Zone must be drawn inside the farm boundary.'
        )
        polygon.setMap(null)
        return
      }
    }

    if (occupiedBoundaries?.length) {
      const nextPath = points.map(toLatLng)
      const occupied = occupiedBoundaries
        .map((boundarySet) => boundarySet.map(toLatLng))
        .some((boundarySet) =>
          polygonIntersects(nextPath, boundarySet)
        )
      if (occupied) {
        setBoundaryError(
          'Zone overlaps an existing zone. Please draw a different area.'
        )
        polygon.setMap(null)
        return
      }
    }

    setBoundaryError(null)

    if (onAreaChange && window.google?.maps?.geometry) {
      const areaMeters = window.google.maps.geometry.spherical.computeArea(
        polygon.getPath()
      )
      onAreaChange(areaMeters / 10000)
    }

    polygon.setMap(null)
    onBoundaryChange(points)
  }

  const handleLocate = () => {
    if (locating) return
    setLocateError(null)

    if (!navigator.geolocation) {
      setLocateError('Geolocation is not supported in this browser.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setMapCenter(next)
        setUserLocation(next)
        map?.panTo(next)
        map?.setZoom(16)
        setLocating(false)
      },
      (error) => {
        setLocateError(error.message || 'Unable to get current location.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

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
    <div className="relative h-full w-full">
      <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
        {showLocate ? (
          <button
            type="button"
            onClick={handleLocate}
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-md hover:bg-slate-50 disabled:opacity-60"
            disabled={locating}
          >
            {locating ? 'Locating...' : 'Locate me'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            onBoundaryChange([])
            onAreaChange?.(0)
          }}
          className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-md hover:bg-slate-50 disabled:opacity-60"
          disabled={!path.length}
        >
          Clear boundary
        </button>
        {locateError ? (
          <div className="rounded-md bg-white/90 px-2 py-1 text-[11px] text-red-600 shadow">
            {locateError}
          </div>
        ) : null}
        {boundaryError ? (
          <div className="rounded-md bg-white/90 px-2 py-1 text-[11px] text-red-600 shadow">
            {boundaryError}
          </div>
        ) : null}
      </div>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={mapCenter}
        zoom={zoom}
        onLoad={(instance) => setMap(instance)}
        options={{
          mapTypeId: 'hybrid',
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
          clickableIcons: false,
        }}
      >
        {userLocation && window.google?.maps ? (
          <Marker
            position={userLocation}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#2b7cff',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: 7,
            }}
          />
        ) : null}
        {limitPath.length ? (
          <Polygon
            path={limitPath}
            options={{
              fillColor: '#22c55e',
              fillOpacity: 0.08,
              strokeColor: '#16a34a',
              strokeWeight: 2,
            }}
          />
        ) : null}
        {occupiedBoundaries?.length
          ? occupiedBoundaries.map((boundarySet, index) => (
              <Polygon
                key={`occupied-${index}`}
                path={boundarySet.map(toLatLng)}
                options={{
                  fillColor: '#f97316',
                  fillOpacity: 0.12,
                  strokeColor: '#ea580c',
                  strokeWeight: 2,
                }}
              />
            ))
          : null}
        {path.length ? (
          <Polygon
            path={path}
            options={{
              fillColor: '#ffffff',
              fillOpacity: 0.25,
              strokeColor: '#2dc0fb',
              strokeWeight: 2,
            }}
          />
        ) : null}
        <DrawingManager
          options={{
            drawingControl: true,
            drawingControlOptions: {
              position: window.google.maps.ControlPosition.TOP_CENTER,
              drawingModes: [window.google.maps.drawing.OverlayType.POLYGON],
            },
            polygonOptions: {
              fillColor: '#ffffff',
              fillOpacity: 0.25,
              strokeColor: '#2dc0fb',
              strokeWeight: 2,
            },
          }}
          onPolygonComplete={handlePolygonComplete}
        />
      </GoogleMap>
    </div>
  )
}
