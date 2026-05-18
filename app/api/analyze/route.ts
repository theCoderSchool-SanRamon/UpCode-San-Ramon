import { NextResponse } from "next/server"
import type { CompetitionLevel, RawScores, Weights } from "@/lib/analysis"

type AnalyzeLocationInput = {
  name?: string
  lat?: number
  lng?: number
  state?: string
}

type AnalyzeBody = {
  locations?: AnalyzeLocationInput[]
  weights?: Partial<Weights>
}

type CensusRows = Record<string, Record<string, number>>

const ACS_5Y_2024_URL = "https://api.census.gov/data/2024/acs/acs5"
const TIGERWEB_TRACTS_QUERY_URL =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/7/query"
const MAPBOX_ISOCHRONE_URL = "https://api.mapbox.com/isochrone/v1/mapbox/driving-traffic/"
const GOOGLE_PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

const EARTH_RADIUS_M = 6_371_008.8
const M_PER_MI = 1_609.344
const ACS_BATCH_SIZE = 200
const HTTP_TIMEOUT_MS = 30_000
const COMPETITION_RADIUS_MILES = 5
const COMPETITION_SEARCH_QUERIES = ["coding school", "tutoring service", "STEM program"]

const DEFAULT_WEIGHTS: Weights = {
  wealth: 0.3,
  family: 0.25,
  education: 0.1,
  competition: 0.2,
  accessibility: 0.15,
}

function normalizeWeights(input?: Partial<Weights>): Weights {
  const merged: Weights = {
    wealth: Number(input?.wealth ?? DEFAULT_WEIGHTS.wealth),
    family: Number(input?.family ?? DEFAULT_WEIGHTS.family),
    education: Number(input?.education ?? DEFAULT_WEIGHTS.education),
    competition: Number(input?.competition ?? DEFAULT_WEIGHTS.competition),
    accessibility: Number(input?.accessibility ?? DEFAULT_WEIGHTS.accessibility),
  }

  const total =
    merged.wealth +
    merged.family +
    merged.education +
    merged.competition +
    merged.accessibility

  if (!Number.isFinite(total) || total <= 0) return DEFAULT_WEIGHTS

  return {
    wealth: merged.wealth / total,
    family: merged.family / total,
    education: merged.education / total,
    competition: merged.competition / total,
    accessibility: merged.accessibility / total,
  }
}

function toFloat(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function redactUrl(url: string): string {
  return url.replace(/([?&]key=)[^&]*/i, "$1[redacted]")
}

function censusKeyErrorFromHtml(text: string): string | null {
  if (!/<html/i.test(text)) return null
  if (/<title>\s*Invalid Key\s*<\/title>/i.test(text)) {
    return "Census API key is invalid or has not been activated"
  }
  if (/<title>\s*Missing Key\s*<\/title>/i.test(text)) {
    return "CENSUS_API_KEY is not configured"
  }
  return null
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    })
    const text = await response.text()

    let payload: unknown = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch (err) {
      const censusKeyError = censusKeyErrorFromHtml(text)
      if (censusKeyError) {
        throw new Error(censusKeyError)
      }
      const snippet = String(text).slice(0, 240).replace(/\s+/g, " ")
      const msg = `Invalid JSON from ${redactUrl(url)} (HTTP ${response.status} ${response.statusText}): ${snippet}`
      throw new Error(msg)
    }

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? JSON.stringify((payload as any).error)
          : response.statusText
      throw new Error(message)
    }

    return payload as T
  } finally {
    clearTimeout(timeout)
  }
}

function destinationPoint(
  latDeg: number,
  lngDeg: number,
  bearingDeg: number,
  distanceM: number
): [number, number] {
  const lat1 = (latDeg * Math.PI) / 180
  const lng1 = (lngDeg * Math.PI) / 180
  const bearing = (bearingDeg * Math.PI) / 180
  const angularDistance = distanceM / EARTH_RADIUS_M

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  )
  let lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    )
  lng2 = ((lng2 + Math.PI) % (2 * Math.PI)) - Math.PI

  return [(lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI]
}

function buildGeodesicCircle(lat: number, lng: number, radiusMiles: number, steps = 72) {
  const radiusM = radiusMiles * M_PER_MI
  const ring: number[][] = []

  for (let step = 0; step < steps; step += 1) {
    const [pointLat, pointLng] = destinationPoint(lat, lng, step * (360 / steps), radiusM)
    ring.push([pointLng, pointLat])
  }
  ring.push(ring[0])

  return { type: "Polygon", coordinates: [ring] }
}

function geojsonToArcgisPolygon(geometry: any) {
  if (geometry?.type === "Polygon" && geometry.coordinates) {
    return { rings: geometry.coordinates, spatialReference: { wkid: 4326 } }
  }
  if (geometry?.type === "MultiPolygon" && geometry.coordinates) {
    return {
      rings: geometry.coordinates.flatMap((polygon: number[][][]) => polygon),
      spatialReference: { wkid: 4326 },
    }
  }
  throw new Error(`Unsupported geometry type for tract query: ${geometry?.type}`)
}

async function lookupTractGeoids(geometry: any): Promise<string[]> {
  const formData = new URLSearchParams({
    f: "json",
    where: "1=1",
    geometryType: "esriGeometryPolygon",
    geometry: JSON.stringify(geojsonToArcgisPolygon(geometry)),
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnGeometry: "false",
    outFields: "GEOID",
  })

  const payload = await fetchJson<any>(TIGERWEB_TRACTS_QUERY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData,
  })

  if (payload?.error) {
    throw new Error(payload.error.message || "TIGERweb query failed")
  }

  const geoids: string[] = (payload?.features ?? [])
    .map((feature: any) => String(feature?.attributes?.GEOID ?? "").trim())
    .filter((geoid: string) => geoid.length === 11 && /^\d+$/.test(geoid))

  return Array.from(new Set(geoids)).sort()
}

async function queryAcs(geoids: string[], variables: string[]): Promise<CensusRows> {
  if (!geoids.length || !variables.length) return {}

  const censusApiKey = process.env.CENSUS_API_KEY
  if (!censusApiKey) {
    throw new Error("CENSUS_API_KEY is not configured")
  }

  const rowsByGeoid: CensusRows = {}

  for (let index = 0; index < geoids.length; index += ACS_BATCH_SIZE) {
    const batch = geoids.slice(index, index + ACS_BATCH_SIZE)
    const params = new URLSearchParams({
      get: ["GEO_ID", ...variables].join(","),
      ucgid: batch.map((geoid) => `1400000US${geoid}`).join(","),
      key: censusApiKey,
    })
    const payload = await fetchJson<unknown[][]>(`${ACS_5Y_2024_URL}?${params}`)

    if (!Array.isArray(payload) || payload.length < 2) continue

    const headers = payload[0].map(String)
    for (const rawRow of payload.slice(1)) {
      const row = Object.fromEntries(headers.map((header, rowIndex) => [header, rawRow[rowIndex]]))
      const geoid = String(row.GEO_ID ?? "").replace("1400000US", "")
      if (geoid.length !== 11 || !/^\d+$/.test(geoid)) continue

      rowsByGeoid[geoid] = Object.fromEntries(
        variables.map((variable) => [variable, toFloat(row[variable])])
      )
    }
  }

  for (const geoid of geoids) {
    rowsByGeoid[geoid] ??= Object.fromEntries(variables.map((variable) => [variable, 0]))
  }

  return rowsByGeoid
}

function sumVariable(rowsByGeoid: CensusRows, variable: string): number {
  return Object.values(rowsByGeoid).reduce((sum, row) => sum + (row[variable] ?? 0), 0)
}

async function evaluateAccessibility(lat: number, lng: number): Promise<[number, string | null]> {
  const token = process.env.MAPBOX_TOKEN
  if (!token) return [0, "MAPBOX_TOKEN is not configured"]

  const params = new URLSearchParams({
    contours_minutes: "15",
    denoise: "1",
    polygons: "true",
    access_token: token,
  })
  const payload = await fetchJson<any>(`${MAPBOX_ISOCHRONE_URL}${lng},${lat}?${params}`)
  const geometry = payload?.features?.[0]?.geometry
  if (!geometry) throw new Error("Mapbox response is missing geometry")

  const tractGeoids = await lookupTractGeoids(geometry)
  if (!tractGeoids.length) return [0, "No census tracts intersect the Mapbox isochrone"]

  const rows = await queryAcs(tractGeoids, ["B01003_001E"])
  return [sumVariable(rows, "B01003_001E"), null]
}

function competitionLevelFromCount(competitorCount: number): CompetitionLevel {
  if (competitorCount >= 9) return "High"
  if (competitorCount >= 4) return "Medium"
  return "Low"
}

function competitionScoreFromCount(competitorCount: number): number {
  return Math.max(0, Math.min(100, 100 - (competitorCount / 12) * 100))
}

async function evaluateCompetition(lat: number, lng: number): Promise<[number, CompetitionLevel, number, string | null]> {
  const token = process.env.GOOGLE_API_KEY
  if (!token) return [50, "Medium", 0, "GOOGLE_API_KEY is not configured"]

  const placeIds = new Set<string>()

  for (const textQuery of COMPETITION_SEARCH_QUERIES) {
    const payload = await fetchJson<any>(GOOGLE_PLACES_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": token,
        "X-Goog-FieldMask": "places.id,places.businessStatus",
      },
      body: JSON.stringify({
        maxResultCount: 20,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: COMPETITION_RADIUS_MILES * M_PER_MI,
          },
        },
        textQuery,
      }),
    })

    for (const place of payload?.places ?? []) {
      const placeId = String(place?.id ?? "").trim()
      const status = String(place?.businessStatus ?? "").trim().toUpperCase()
      if (placeId && (!status || status === "OPERATIONAL")) placeIds.add(placeId)
    }
  }

  const competitorCount = placeIds.size
  return [
    competitionScoreFromCount(competitorCount),
    competitionLevelFromCount(competitorCount),
    competitorCount,
    null,
  ]
}

async function analyzeLocation(location: AnalyzeLocationInput, weights: Weights) {
  const lat = Number(location.lat)
  const lng = Number(location.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Location is missing numeric coordinates")
  }

  const warnings: string[] = []
  const tractGeoids = await lookupTractGeoids(buildGeodesicCircle(lat, lng, 5))
  if (!tractGeoids.length) {
    throw new Error("No census tracts found within the 5-mile study area")
  }

  const censusRows = await queryAcs(tractGeoids, [
    "B19001_001E",
    "B19001_017E",
    "B01001_003E",
    "B15003_022E",
    "B19013_001E",
  ])

  const totalHouseholds = sumVariable(censusRows, "B19001_001E")
  const wealthyHouseholds = sumVariable(censusRows, "B19001_017E")
  const totalStudents = sumVariable(censusRows, "B01001_003E")
  const bachelorsTotal = sumVariable(censusRows, "B15003_022E")
  const incomeTotal = sumVariable(censusRows, "B19013_001E")
  const tractCount = Math.max(Object.keys(censusRows).length, 1)

  const wealthyShare = totalHouseholds > 0 ? (wealthyHouseholds / totalHouseholds) * 100 : 0
  const avgBachelors = bachelorsTotal / tractCount
  const avgIncome = incomeTotal / tractCount

  const [driveTimePopulation, accessWarning] = await evaluateAccessibility(lat, lng)
  if (accessWarning) warnings.push(accessWarning)

  const [scoreCompetition, competitionLevel, competitorCount, competitionWarning] =
    await evaluateCompetition(lat, lng)
  if (competitionWarning) warnings.push(competitionWarning)

  const rawScores: RawScores = {
    wealth: Math.min((wealthyShare / 25) * 100, 100),
    family: Math.min((totalStudents / 4000) * 100, 100),
    education: Math.min((avgBachelors / 800) * 100, 100),
    competition: scoreCompetition,
    accessibility: Math.min((driveTimePopulation / 50000) * 100, 100),
  }

  const finalScore =
    rawScores.wealth * weights.wealth +
    rawScores.family * weights.family +
    rawScores.education * weights.education +
    rawScores.competition * weights.competition +
    rawScores.accessibility * weights.accessibility

  const rationaleParts = [
    `${Math.round(driveTimePopulation).toLocaleString()} people are estimated inside the 15-minute drive-time isochrone.`,
    `${tractGeoids.length} census tracts intersect the 5-mile study area.`,
    `Average tract median income is approximately $${Math.round(avgIncome).toLocaleString()}.`,
    `${competitorCount} nearby competitor locations were found across coding school, tutoring, and STEM program searches.`,
  ]
  if (warnings.length) rationaleParts.push(`Warnings: ${warnings.join("; ")}.`)

  return {
    name: location.name || "Unknown Location",
    score: Math.round(finalScore),
    estimatedFamilies: Math.round(totalStudents).toLocaleString(),
    medianIncome: `${wealthyShare.toFixed(1)}% >$200k`,
    competition: competitionLevel,
    rationale: rationaleParts.join(" "),
    rawScores: Object.fromEntries(
      Object.entries(rawScores).map(([key, value]) => [key, Number(value.toFixed(2))])
    ),
    scoreMetrics: {
      tractCount: tractGeoids.length,
      totalHouseholds: Math.round(totalHouseholds),
      wealthyHouseholds: Math.round(wealthyHouseholds),
      wealthyShare: Number(wealthyShare.toFixed(2)),
      schoolAgeChildren: Math.round(totalStudents),
      bachelorsEstimate: Math.round(bachelorsTotal),
      averageTractMedianIncome: Math.round(avgIncome),
      driveTimePopulation: Math.round(driveTimePopulation),
      competitorCount,
      warnings,
      censusVariables: {
        B19001_001E: "Total households",
        B19001_017E: "Households with income of $200,000 or more",
        B01001_003E: "Male population under 5 years; used here as the app's child-density proxy",
        B15003_022E: "Population 25+ with bachelor's degree",
        B19013_001E: "Median household income",
      },
    },
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeBody
    const locations = Array.isArray(body.locations) ? body.locations : []

    if (!locations.length) {
      return NextResponse.json({ error: "Missing required field: locations" }, { status: 400 })
    }

    const weights = normalizeWeights(body.weights)
    const results = await Promise.all(
      locations.map(async (location) => {
        try {
          return await analyzeLocation(location, weights)
        } catch (error) {
          return {
            name: location.name || "Error Location",
            score: 0,
            estimatedFamilies: "Error",
            medianIncome: "Error",
            competition: "High" as CompetitionLevel,
            rationale: `System Error: ${error instanceof Error ? error.message : String(error)}`,
            rawScores: {
              wealth: 0,
              family: 0,
              education: 0,
              competition: 0,
              accessibility: 0,
            },
            scoreMetrics: {
              warnings: [error instanceof Error ? error.message : String(error)],
            },
          }
        }
      })
    )

    results.sort((a, b) => b.score - a.score)

    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not complete location analysis",
      },
      { status: 500 }
    )
  }
}
