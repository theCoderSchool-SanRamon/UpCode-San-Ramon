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

function asOptionalNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" ? (value as UnknownRecord) : null
}

function asStringRecord(value: unknown): Record<string, string> | undefined {
  const record = asRecord(value)
  if (!record) return undefined

  return Object.fromEntries(
    Object.entries(record).map(([key, val]) => [key, String(val)])
  )
}

function asStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean)
  }
  if (typeof value === "string" && value.trim()) {
    return [value]
  }
  return undefined
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

function normalizeScoreMetrics(input: unknown): ScoreMetrics | undefined {
  const metrics = asRecord(input)
  if (!metrics) return undefined

  return {
    tractCount: asOptionalNumber(metrics.tractCount ?? metrics.tract_count),
    totalHouseholds: asOptionalNumber(metrics.totalHouseholds ?? metrics.total_households),
    wealthyHouseholds: asOptionalNumber(metrics.wealthyHouseholds ?? metrics.wealthy_households),
    wealthyShare: asOptionalNumber(metrics.wealthyShare ?? metrics.wealthy_share),
    schoolAgeChildren: asOptionalNumber(metrics.schoolAgeChildren ?? metrics.school_age_children),
    bachelorsEstimate: asOptionalNumber(metrics.bachelorsEstimate ?? metrics.bachelors_estimate),
    averageTractMedianIncome: asOptionalNumber(
      metrics.averageTractMedianIncome ?? metrics.average_tract_median_income
    ),
    driveTimePopulation: asOptionalNumber(metrics.driveTimePopulation ?? metrics.drive_time_population),
    competitorCount: asOptionalNumber(metrics.competitorCount ?? metrics.competitor_count),
    warnings: asStringArray(metrics.warnings),
    censusVariables: asStringRecord(metrics.censusVariables ?? metrics.census_variables),
  }
}

export function normalizeCandidateLocation(input: unknown): CandidateLocation {
  const item = asRecord(input) ?? {}
  const rawScoresInput =
    asRecord(item.rawScores) ?? asRecord(item.raw_scores)

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
    scoreMetrics: normalizeScoreMetrics(item.scoreMetrics ?? item.score_metrics),
  }
}

export function normalizeCandidateLocations(input: unknown): CandidateLocation[] {
  if (!Array.isArray(input)) return []
  return input.map(normalizeCandidateLocation)
}
