import { NextResponse } from "next/server"

interface PhotonFeature {
  geometry?: {
    coordinates?: [number, number]
  }
  properties?: {
    countrycode?: string
    housenumber?: string
    street?: string
    city?: string
    state?: string
    name?: string
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = (searchParams.get("q") || "").trim()

  if (query.length <= 2) {
    return NextResponse.json({ results: [] })
  }

  const params = new URLSearchParams({
    q: query,
    limit: "10",
    lat: "37.0902",
    lon: "-95.7129",
  })

  try {
    const response = await fetch(`https://photon.komoot.io/api/?${params}`, {
      headers: {
        "User-Agent": "UpCode-Project/1.0",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json({ results: [] })
    }

    const data = (await response.json()) as { features?: PhotonFeature[] }
    const suggestions: Array<{
      display: string
      state: string
      lat: number
      lon: number
    }> = []

    for (const feature of data.features || []) {
      const props = feature.properties || {}

      if ((props.countrycode || "").toLowerCase() !== "us") {
        continue
      }

      const num = props.housenumber || ""
      const street = props.street || ""
      const city = props.city || ""
      const state = props.state || ""

      let mainAddr = `${num} ${street}`.trim()
      if (!mainAddr) {
        mainAddr = props.name || ""
      }

      const display = [mainAddr, city, state].filter(Boolean).join(", ")
      const coords = feature.geometry?.coordinates || [0, 0]

      if (!display) {
        continue
      }

      suggestions.push({
        display,
        state,
        lat: Number(coords[1]) || 0,
        lon: Number(coords[0]) || 0,
      })
    }

    return NextResponse.json({ results: suggestions })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
