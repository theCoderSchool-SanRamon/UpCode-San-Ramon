export type CompetitionLevel = "Low" | "Medium" | "High"

export type Weights = {
  wealth: number
  family: number
  education: number
  competition: number
  accessibility: number
}

export type RawScores = {
  wealth: number
  family: number
  education: number
  competition: number
  accessibility: number
}

export type ScoreMetrics = {
  tractCount?: number
  totalHouseholds?: number
  wealthyHouseholds?: number
  wealthyShare?: number
  schoolAgeChildren?: number
  bachelorsEstimate?: number
  averageTractMedianIncome?: number
  driveTimePopulation?: number
  competitorCount?: number
  warnings?: string[]
  censusVariables?: Record<string, string>
}

export type CandidateLocation = {
  name: string
  score: number
  estimatedFamilies: string
  medianIncome: string
  competition: CompetitionLevel
  rationale: string
  rawScores?: RawScores
  scoreMetrics?: ScoreMetrics
}

type UnknownRecord = Record<string, unknown>

const DEFAULT_RAW_SCORES: RawScores = {
  wealth: 0,
  family: 0,
  education: 0,
  competition: 0,
  accessibility: 0,
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function toCompetitionLevel(value: unknown): CompetitionLevel {
  if (value === "Low" || value === "Medium" || value === "High") {
    return value
  }

  const numeric = asNumber(value, NaN)
  if (Number.isFinite(numeric)) {
    if (numeric >= 67) return "Low"
    if (numeric >= 34) return "Medium"
    return "High"
  }

  return "Medium"
}

export function normalizeCandidateLocation(input: unknown): CandidateLocation {
  const item = (input && typeof input === "object" ? input : {}) as UnknownRecord
  const rawScoresInput =
    item.rawScores && typeof item.rawScores === "object"
      ? (item.rawScores as UnknownRecord)
      : null

  const competitionScore = asNumber(
    rawScoresInput?.competition ??
      item.competition_score ??
      item.competitionScore ??
      item.competitionValue,
    DEFAULT_RAW_SCORES.competition
  )

  const rawScores: RawScores = {
    wealth: asNumber(rawScoresInput?.wealth, DEFAULT_RAW_SCORES.wealth),
    family: asNumber(rawScoresInput?.family, DEFAULT_RAW_SCORES.family),
    education: asNumber(rawScoresInput?.education, DEFAULT_RAW_SCORES.education),
    competition: competitionScore,
    accessibility: asNumber(
      rawScoresInput?.accessibility,
      DEFAULT_RAW_SCORES.accessibility
    ),
  }

  return {
    name: asString(item.name, "Unknown Location"),
    score: asNumber(item.score),
    estimatedFamilies: asString(item.estimatedFamilies, "--"),
    medianIncome: asString(item.medianIncome, "--"),
    competition: toCompetitionLevel(item.competition),
    rationale: asString(item.rationale, ""),
    rawScores,
    scoreMetrics:
      item.scoreMetrics && typeof item.scoreMetrics === "object"
        ? (item.scoreMetrics as ScoreMetrics)
        : undefined,
  }
}

export function normalizeCandidateLocations(input: unknown): CandidateLocation[] {
  if (!Array.isArray(input)) return []
  return input.map(normalizeCandidateLocation)
}
