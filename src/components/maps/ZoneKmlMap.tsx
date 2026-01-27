'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  kmlPath?: string
  center: { lat: number; lng: number }
  zoom: number
  className?: string
}

export default function ZoneKmlMap({
  kmlPath = '/cocofarm.kml',
  center,
  zoom,
  className,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setError('Missing Google Maps API key.')
      return
    }

    const parseKmlPolygons = (kmlText: string) => {
      const doc = new DOMParser().parseFromString(kmlText, 'application/xml')
      const polygons = Array.from(doc.getElementsByTagName('Polygon'))
      return polygons
        .map((polygon) => {
          const coordNode = polygon.getElementsByTagName('coordinates')[0]
          if (!coordNode?.textContent) return null
          const path = coordNode.textContent
            .trim()
            .split(/\s+/)
            .map((pair) => {
              const [lng, lat] = pair.split(',').map(Number)
              if (Number.isNaN(lat) || Number.isNaN(lng)) return null
              return { lat, lng }
            })
            .filter(Boolean) as google.maps.LatLngLiteral[]
          return path.length ? path : null
        })
        .filter(Boolean) as google.maps.LatLngLiteral[][]
    }

    const loadKmlLocally = async (map: google.maps.Map) => {
      try {
        const res = await fetch(kmlPath)
        if (!res.ok) throw new Error('Failed to fetch KML')
        const text = await res.text()
        const polygons = parseKmlPolygons(text)
        if (!polygons.length) throw new Error('No polygons found in KML')
        polygons.forEach((path) => {
          map.data.add({
            geometry: new google.maps.Data.Polygon([path]),
          })
        })
        map.data.setStyle({
          fillColor: '#ffffff',
          fillOpacity: 0.25,
          strokeColor: '#2dc0fb',
          strokeWeight: 2,
        })
      } catch {
        setError('Unable to load KML overlay.')
      }
    }

    const initMap = () => {
      if (!mapRef.current || mapInstance.current) return
      if (!window.google?.maps?.Map) {
        setError('Google Maps failed to initialize. Check API key or referrer.')
        return
      }
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeId: 'satellite',
        disableDefaultUI: true,
        zoomControl: true,
        fullscreenControl: true,
      })

      loadKmlLocally(mapInstance.current)
    }

    if (window.google?.maps?.Map) {
      initMap()
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps="true"]'
    )
    if (existing) {
      existing.addEventListener('load', () => {
        const retries = 5
        let attempts = 0
        const timer = setInterval(() => {
          if (window.google?.maps?.Map) {
            clearInterval(timer)
            initMap()
          } else if (attempts >= retries) {
            clearInterval(timer)
            setError('Google Maps failed to initialize. Check API key or referrer.')
          }
          attempts += 1
        }, 300)
      })
      existing.addEventListener('error', () =>
        setError('Google Maps failed to load.')
      )
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`
    script.async = true
    script.defer = true
    script.dataset.googleMaps = 'true'
    script.addEventListener('load', () => {
      const retries = 5
      let attempts = 0
      const timer = setInterval(() => {
        if (window.google?.maps?.Map) {
          clearInterval(timer)
          initMap()
        } else if (attempts >= retries) {
          clearInterval(timer)
          setError('Google Maps failed to initialize. Check API key or referrer.')
        }
        attempts += 1
      }, 300)
    })
    script.addEventListener('error', () =>
      setError('Google Maps failed to load.')
    )
    document.head.appendChild(script)
  }, [center, zoom, kmlPath])

  return (
    <div className={className}>
      {error ? (
        <div className="flex h-full items-center justify-center text-sm text-red-600">
          {error}
        </div>
      ) : null}
      <div ref={mapRef} className="h-full w-full rounded-2xl" />
    </div>
  )
}
