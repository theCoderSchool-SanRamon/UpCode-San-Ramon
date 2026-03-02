import { NextResponse } from "next/server"
import { preselectedCities } from "@/lib/mock-data"

type Weights = {
  wealth: number
  family: number
  education: number
  competition: number
  accessibility: number
}

type CityResult = {
  city: string
  overallScore: number
  wealth: number
  family: number
  education: number
  competition: number
  accessibility: number
  percentile?: number
}

type RecommendBody = {
  weights?: Partial<Weights>
  state?: string
}

const DEFAULT_WEIGHTS: Weights = {
  wealth: 0.3,
  family: 0.25,
  education: 0.1,
  competition: 0.2,
  accessibility: 0.15,
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
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

function seededScore(seed: string, factor: string): number {
  const combined = `${seed}:${factor}`
  let hash = 0
  for (let i = 0; i < combined.length; i += 1) {
    hash = (hash * 31 + combined.charCodeAt(i)) % 2147483647
  }
  return clamp01((hash % 1000) / 1000)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RecommendBody
    const state = String(body?.state || "").toUpperCase()
    const weights = normalizeWeights(body?.weights)

    if (!state) {
      return NextResponse.json(
        { error: "Missing required field: state" },
        { status: 400 }
      )
    }

    const candidates = preselectedCities.filter(
      (city) => city.state.toUpperCase() === state
    )

    const pool = candidates.length > 0 ? candidates : preselectedCities

    const results: CityResult[] = pool.map((city) => {
      const seed = `${city.fullName}|${state}`
      const wealth = seededScore(seed, "wealth")
      const family = seededScore(seed, "family")
      const education = seededScore(seed, "education")
      const competition = seededScore(seed, "competition")
      const accessibility = seededScore(seed, "accessibility")

      const overallScore = round2(
        wealth * weights.wealth +
          family * weights.family +
          education * weights.education +
          competition * weights.competition +
          accessibility * weights.accessibility
      )

      return {
        city: city.fullName,
        overallScore,
        wealth: round2(wealth),
        family: round2(family),
        education: round2(education),
        competition: round2(competition),
        accessibility: round2(accessibility),
      }
    })

    results.sort((a, b) => b.overallScore - a.overallScore)

    const total = results.length || 1
    const ranked = results.map((result, index) => ({
      ...result,
      percentile: round2((total - index) / total),
    }))

    return NextResponse.json({ results: ranked.slice(0, 10) })
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 }
    )
  }
}
