"use client"

import { useEffect, useRef, useState } from "react"

const FIPS_TO_ABBR: Record<string, string> = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY",
}

declare global {
  interface Window {
    L?: any
    topojson?: {
      feature: (topology: any, object: any) => { features?: any[] }
    }
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(script)
  })
}

function ensureLeafletStyles() {
  const href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  const existing = document.querySelector(`link[href="${href}"]`)
  if (existing) return
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = href
  document.head.appendChild(link)
}

interface USMapProps {
  selectedState: string | null
  onSelectState: (abbr: string) => void
}

export function USMap({ selectedState, onSelectState }: USMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const geoJsonLayerRef = useRef<any>(null)
  const onSelectStateRef = useRef(onSelectState)
  const selectedStateRef = useRef<string | null>(selectedState)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onSelectStateRef.current = onSelectState
  }, [onSelectState])

  useEffect(() => {
    selectedStateRef.current = selectedState
  }, [selectedState])

  useEffect(() => {
    let active = true

    async function initMap() {
      if (!mapRef.current || leafletMapRef.current) return

      try {
        ensureLeafletStyles()
        await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js")
        await loadScript("https://unpkg.com/topojson-client@3")

        if (!active || !mapRef.current || !window.L || !window.topojson) return

        const L = window.L
        const map = L.map(mapRef.current, {
          zoomControl: true,
          minZoom: 3,
          maxZoom: 8,
          scrollWheelZoom: true,
        })
        leafletMapRef.current = map

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map)

        map.fitBounds(
          [
            [23.5, -127],
            [50.5, -65],
          ],
          { padding: [8, 8] }
        )

        const topoResponse = await fetch(
          "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json",
          { cache: "force-cache" }
        )
        const topoData = await topoResponse.json()
        const geoData = window.topojson.feature(
          topoData,
          topoData.objects.states
        )

        const toAbbr = (feature: any) => {
          const fips = String(feature?.id || "").padStart(2, "0")
          return FIPS_TO_ABBR[fips] || null
        }

        const styleFor = (feature: any) => {
          const abbr = toAbbr(feature)
          const isSelected = !!abbr && abbr === selectedStateRef.current
          return {
            fillColor: isSelected ? "#047857" : "#dce2eb",
            fillOpacity: isSelected ? 0.8 : 0.55,
            color: isSelected ? "#e7f5ee" : "#a8b3c7",
            weight: isSelected ? 2 : 1,
          }
        }

        const layer = L.geoJSON(geoData as any, {
          style: styleFor,
          onEachFeature: (feature: any, featureLayer: any) => {
            const abbr = toAbbr(feature)
            if (!abbr) return

            featureLayer.on("click", () => onSelectStateRef.current(abbr))
            featureLayer.on("mouseover", () => {
              featureLayer.setStyle({ fillOpacity: 0.75 })
            })
            featureLayer.on("mouseout", () => {
              const currentStyles = styleFor(feature)
              featureLayer.setStyle(currentStyles)
            })
          },
        }).addTo(map)

        geoJsonLayerRef.current = layer
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load map")
      }
    }

    initMap()

    return () => {
      active = false
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
      geoJsonLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!geoJsonLayerRef.current) return

    geoJsonLayerRef.current.eachLayer((featureLayer: any) => {
      const feature = featureLayer.feature
      const fips = String(feature?.id || "").padStart(2, "0")
      const abbr = FIPS_TO_ABBR[fips] || null
      const isSelected = !!abbr && abbr === selectedState

      featureLayer.setStyle({
        fillColor: isSelected ? "#047857" : "#dce2eb",
        fillOpacity: isSelected ? 0.8 : 0.55,
        color: isSelected ? "#e7f5ee" : "#a8b3c7",
        weight: isSelected ? 2 : 1,
      })

      if (isSelected && featureLayer.bringToFront) {
        featureLayer.bringToFront()
      }
    })
  }, [selectedState])

  return (
    <div className="relative w-full">
      <div
        ref={mapRef}
        className="us-leaflet-map h-[55vh] min-h-[360px] w-full rounded-xl"
        aria-label="Map of the United States"
      />
      {error && (
        <div className="absolute inset-x-3 bottom-3 rounded-md border border-destructive/30 bg-card/95 px-3 py-2 text-xs text-destructive shadow-sm">
          {error}
        </div>
      )}
    </div>
  )
}
