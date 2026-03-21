import { NextResponse } from "next/server"

type Weights = {
  wealth: number
  family: number
  education: number
  competition: number
  accessibility: number
}

type CandidateLocation = {
  name: string
  score: number
  estimatedFamilies: string
  medianIncome: string
  competition: "Low" | "Medium" | "High"
  rationale: string
  rawScores?: {
    wealth: number
    family: number
    education: number
    competition: number
    accessibility: number
  }
}

type RecommendBody = {
  weights?: Partial<Weights>
  locations?: Array<{
    name?: string
    lat?: number
    lng?: number
    state?: string
  }>
}

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

  if (!Number.isFinite(total) || total <= 0) {
    return DEFAULT_WEIGHTS
  }

  return {
    wealth: merged.wealth / total,
    family: merged.family / total,
    education: merged.education / total,
    competition: merged.competition / total,
    accessibility: merged.accessibility / total,
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RecommendBody
    const locations = Array.isArray(body?.locations) ? body.locations : []
    const weights = normalizeWeights(body?.weights)

    if (locations.length === 0) {
      return NextResponse.json(
        { error: "Missing required field: locations" },
        { status: 400 }
      )
    }

    const flaskResponse = await fetch("http://127.0.0.1:5000/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ locations, weights }),
      cache: "no-store",
    })

    const payload = (await flaskResponse.json()) as {
      error?: string
      results?: CandidateLocation[]
    }

    if (!flaskResponse.ok) {
      return NextResponse.json(
        { error: payload.error || "Flask analysis request failed" },
        { status: flaskResponse.status }
      )
    }

    return NextResponse.json({ results: payload.results || [] })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not reach the Flask analysis service",
      },
      { status: 502 }
    )
  }
}
