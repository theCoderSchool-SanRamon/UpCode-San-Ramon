"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Calculator, MapPin, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { percent, VISUAL_WEIGHTS } from "@/components/analysis-screen"
import type { CandidateLocation, ScoreMetrics, Weights } from "@/lib/analysis"
import { generateInvestmentBrief } from "@/lib/pdf-utils"
import { cn } from "@/lib/utils"

interface LocationDetailProps {
  location: CandidateLocation
  weights: Weights
  onBack: () => void
}

type FactorDetail = {
  key: keyof Weights
  label: string
  weightVal: number
  factorScore: number
  contribution: number
  explanation: string
  hasRawScore: boolean
}

export function LocationDetailScreen({ location, weights, onBack }: LocationDetailProps) {
  const [activeFactor, setActiveFactor] = useState<keyof Weights>(VISUAL_WEIGHTS[0].key as keyof Weights)

  const hasRawScores = Boolean(location.rawScores)

  const factorDetails = useMemo<FactorDetail[]>(() => {
    return VISUAL_WEIGHTS.map((item) => {
      const key = item.key as keyof Weights
      const weightVal = weights[key]
      const factorScore = location.rawScores?.[key] ?? 0
      const contribution = weightVal * factorScore

      return {
        key,
        label: item.label,
        weightVal,
        factorScore,
        contribution,
        explanation: getFactorExplanation(
          key,
          item.label,
          factorScore,
          weightVal,
          contribution,
          location.scoreMetrics
        ),
        hasRawScore: hasRawScores,
      }
    })
  }, [hasRawScores, location.rawScores, location.scoreMetrics, weights])

  const calculatedTotal = factorDetails.reduce((sum, item) => sum + item.contribution, 0)
  const activeDetail =
    factorDetails.find((item) => item.key === activeFactor) ?? factorDetails[0] ?? null
  const warnings = location.scoreMetrics?.warnings ?? []

  useEffect(() => {
    setActiveFactor(VISUAL_WEIGHTS[0].key as keyof Weights)
  }, [location.name])

  const handleExportBrief = async () => {
    await generateInvestmentBrief({
      locationName: location.name,
      finalScore: location.score,
      rationale: location.rationale,
      weights,
      rawScores: location.rawScores,
      estimatedFamilies: location.estimatedFamilies,
      medianIncome: location.medianIncome,
      competition: location.competition,
    })
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8 md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="w-fit gap-2 pl-0 text-muted-foreground transition-colors hover:bg-transparent hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Rankings
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportBrief}
          className="w-fit gap-2"
        >
          <Download className="h-4 w-4" />
          Export Brief
        </Button>

        <header className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="h-5 w-5" />
                <p className="text-sm font-semibold uppercase tracking-widest">Score Breakdown</p>
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {location.name}
              </h1>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Breakdown of how the final score of {location.score} was calculated.
              </p>
            </div>

            <div className="flex min-w-[140px] flex-col items-center justify-center rounded-xl border border-primary/20 bg-primary/10 p-6">
              <p className="text-sm font-medium uppercase tracking-wider text-primary">Final Score</p>
              <p className="mt-1 text-5xl font-bold text-primary">{location.score}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            Calculation Logic
          </h2>

          {warnings.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {warnings.join("; ")}
            </div>
          ) : null}

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="min-w-0 lg:basis-3/5">
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="grid grid-cols-4 bg-muted/50 p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <div className="col-span-1">Factor</div>
                  <div className="col-span-1 text-center">Your Weight</div>
                  <div className="col-span-1 text-center">Local Area Score</div>
                  <div className="col-span-1 text-right">Contribution</div>
                </div>

                <div className="divide-y divide-border">
                  {factorDetails.map((detail) => {
                    const isActive = activeDetail?.key === detail.key

                    return (
                      <button
                        key={detail.key}
                        type="button"
                        onMouseEnter={() => setActiveFactor(detail.key)}
                        onFocus={() => setActiveFactor(detail.key)}
                        className={cn(
                          "grid w-full grid-cols-4 items-center p-4 text-left text-sm transition-colors",
                          isActive ? "bg-primary/10" : "hover:bg-muted/20"
                        )}
                      >
                        <div className="col-span-1 flex items-center gap-2 font-medium text-foreground">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          {detail.label}
                        </div>

                        <div className="col-span-1 text-center font-mono text-muted-foreground">
                          {percent(detail.weightVal)}%
                        </div>

                        <div className="col-span-1 text-center font-mono text-muted-foreground">
                          {detail.hasRawScore ? `${Math.round(detail.factorScore)} / 100` : "-- / 100"}
                        </div>

                        <div className="col-span-1 text-right font-mono font-semibold text-primary">
                          {detail.hasRawScore ? `+ ${detail.contribution.toFixed(1)} pts` : "+ -- pts"}
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-primary/20 bg-primary/5 p-4">
                  <span className="font-semibold text-primary">Total Weighted Sum</span>
                  <span className="text-2xl font-bold text-primary">
                    {location.rawScores ? Math.round(calculatedTotal) : location.score}
                  </span>
                </div>
              </div>
            </div>

            <aside className="min-w-0 lg:basis-2/5">
              <div className="h-full rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
                    Factor Details
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                    {activeDetail?.label ?? "Factor"}
                  </h3>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <DetailStat
                    label="Your Weight"
                    value={
                      activeDetail ? `${percent(activeDetail.weightVal)}%` : "--"
                    }
                  />
                  <DetailStat
                    label="Local Score"
                    value={
                      activeDetail
                        ? activeDetail.hasRawScore
                          ? `${Math.round(activeDetail.factorScore)}/100`
                          : "-- / 100"
                        : "-- / 100"
                    }
                  />
                  <DetailStat
                    label="Contribution"
                    value={
                      activeDetail
                        ? activeDetail.hasRawScore
                          ? `${activeDetail.contribution.toFixed(1)} pts`
                          : "-- pts"
                        : "-- pts"
                    }
                  />
                </div>

                <div className="mt-5 rounded-lg border border-emerald-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Explanation
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {activeDetail
                      ? activeDetail.hasRawScore
                        ? activeDetail.explanation
                        : "Factor details will appear when raw scoring data is available."
                      : "Hover over a factor row to inspect how it contributes to the total score."}
                  </p>
                </div>

                <p className="mt-4 text-xs leading-6 text-slate-500">
                  Hover over a row in the table to inspect that factor in detail.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  )
}

function getFactorExplanation(
  factorKey: keyof Weights,
  factorLabel: string,
  factorScore: number,
  weightVal: number,
  contribution: number,
  metrics?: ScoreMetrics
) {
  const scoreBand =
    factorScore >= 80 ? "very strong" :
    factorScore >= 60 ? "solid" :
    factorScore >= 40 ? "mixed" :
    "weak"

  const weightedImpact =
    `With your ${percent(weightVal)}% weight on this factor, it contributes ${contribution.toFixed(1)} points to the final score.`

  if (!metrics) {
    const factorSummary: Record<keyof Weights, string> = {
      wealth: "based on the area's income profile and concentration of higher-income households",
      family: "based on the area's concentration of families with school-age children",
      education: "based on education-related Census indicators available for this location",
      competition: "based on how much nearby competition may affect this market",
      accessibility: "based on convenience factors like access, traffic, and ease of visiting",
    }

    return `${factorLabel} received a ${Math.round(factorScore)}/100 local score, which is ${scoreBand} ${factorSummary[factorKey]}. ${weightedImpact}`
  }

  const details: Record<keyof Weights, Array<string | null>> = {
    wealth: [
      metrics.wealthyHouseholds !== undefined && metrics.totalHouseholds !== undefined
        ? `${formatNumber(metrics.wealthyHouseholds)} of ${formatNumber(metrics.totalHouseholds)} households are in the $200k+ income bracket`
        : null,
      metrics.wealthyShare !== undefined
        ? `${formatPercent(metrics.wealthyShare)} of households are $200k+`
        : null,
      metrics.averageTractMedianIncome !== undefined
        ? `average tract median income is about $${formatNumber(metrics.averageTractMedianIncome)}`
        : null,
    ],
    family: [
      metrics.schoolAgeChildren !== undefined
        ? `${formatNumber(metrics.schoolAgeChildren)} children were counted by the app's Census child-density proxy`
        : null,
      metrics.tractCount !== undefined
        ? `across ${formatNumber(metrics.tractCount)} census tracts in the 5-mile study area`
        : null,
    ],
    education: [
      metrics.bachelorsEstimate !== undefined
        ? `${formatNumber(metrics.bachelorsEstimate)} residents in the queried tracts are counted in the bachelor's-degree Census variable`
        : null,
      metrics.bachelorsEstimate !== undefined && metrics.tractCount
        ? `that averages about ${formatNumber(Math.round(metrics.bachelorsEstimate / metrics.tractCount))} per tract before normalization`
        : null,
      metrics.tractCount !== undefined
        ? `using ${formatNumber(metrics.tractCount)} intersecting census tracts`
        : null,
    ],
    competition: [
      metrics.competitorCount !== undefined
        ? `${formatNumber(metrics.competitorCount)} nearby coding school, tutoring, and STEM competitors were found`
        : null,
      "lower competitor counts produce higher competition scores",
    ],
    accessibility: [
      metrics.driveTimePopulation !== undefined
        ? `${formatNumber(metrics.driveTimePopulation)} people are estimated inside the 15-minute drive-time area`
        : null,
      metrics.warnings?.length
        ? `warning: ${metrics.warnings.join("; ")}`
        : null,
    ],
  }

  const specificDetails = details[factorKey].filter(Boolean).join("; ")

  return `${factorLabel} received a ${Math.round(factorScore)}/100 local score, which is ${scoreBand}. It is based on ${specificDetails || "the available local scoring inputs for this result"}. ${weightedImpact}`
}

function formatNumber(value: number) {
  return value.toLocaleString()
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-emerald-100 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}
