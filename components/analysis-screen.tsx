"use client"

import type { ComponentType } from "react"
import {
  ArrowLeft,
  Building2,
  Compass,
  Gauge,
  MapPin,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

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
}

type SelectedCityType = {
  display?: string
  fullName?: string
  name?: string
  state?: string
  lat?: number
  lon?: number
  lng?: number
}

interface AnalysisScreenProps {
  selectedState: string | null
  selectedCity: string | null
  selectedCities?: SelectedCityType[]
  weights: Weights
  onBackToPreferences: () => void
  onBackToLocation: () => void
}

const SAMPLE_LOCATIONS: CandidateLocation[] = [
  {
    name: "Ranked Area #1",
    score: 90,
    estimatedFamilies: "N/A",
    medianIncome: "N/A",
    competition: "Low",
    rationale: "Placeholder rationale for top-ranked area.",
  },
  {
    name: "Ranked Area #2",
    score: 82,
    estimatedFamilies: "N/A",
    medianIncome: "N/A",
    competition: "Medium",
    rationale: "Placeholder rationale for second-ranked area.",
  },
  {
    name: "Ranked Area #3",
    score: 74,
    estimatedFamilies: "N/A",
    medianIncome: "N/A",
    competition: "High",
    rationale: "Placeholder rationale for third-ranked area.",
  },
]

function percent(value: number): number {
  return Math.round(value * 100)
}

const VISUAL_WEIGHTS = [
  { key: "wealth", label: "Wealth", color: "#1d4ed8", soft: "bg-blue-100" },
  { key: "family", label: "Family", color: "#16a34a", soft: "bg-emerald-100" },
  { key: "education", label: "Education", color: "#d97706", soft: "bg-amber-100" },
  { key: "competition", label: "Competition", color: "#dc2626", soft: "bg-rose-100" },
  { key: "accessibility", label: "Accessibility", color: "#0f766e", soft: "bg-teal-100" },
] as const

function radarPoints(values: number[], radius: number, cx: number, cy: number): string {
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length
      const x = cx + Math.cos(angle) * radius * value
      const y = cy + Math.sin(angle) * radius * value
      return `${x},${y}`
    })
    .join(" ")
}

function polygonAtRadius(points: number, radius: number, cx: number, cy: number): string {
  return Array.from({ length: points })
    .map((_, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / points
      const x = cx + Math.cos(angle) * radius
      const y = cy + Math.sin(angle) * radius
      return `${x},${y}`
    })
    .join(" ")
}

export function AnalysisScreen({
  selectedState,
  selectedCity,
  selectedCities,
  weights,
  onBackToPreferences,
  onBackToLocation,
}: AnalysisScreenProps) {
  const weightValues = VISUAL_WEIGHTS.map((item) => weights[item.key])
  const primaryWeight = Object.entries(weights).sort((a, b) => b[1] - a[1])[0]
  const estimatedMarketScore = Math.round(
    70 +
      weights.wealth * 18 +
      weights.family * 15 +
      weights.education * 10 +
      weights.competition * 8 +
      weights.accessibility * 9
  )
  const gaugeCircumference = 2 * Math.PI * 42
  const gaugeOffset = gaugeCircumference - (estimatedMarketScore / 100) * gaugeCircumference

  // Dynamically generate candidate locations based on passed selected cities
  const candidateLocations: CandidateLocation[] =
    selectedCities && selectedCities.length > 0
      ? selectedCities
          .map((city, index) => {
            const cityName = city.display || city.fullName || city.name || `Location #${index + 1}`
            const mockScore = 95 - index * 7
            const comps = ["N/A", "N/A", "N/A", "N/A", "N/A"] as const

            return {
              name: cityName,
              score: mockScore,
              estimatedFamilies: "N/A",
              medianIncome: "N/A",
              competition: comps[index % 5],
              rationale: `Simulated analysis for ${cityName} based on your designated priority weights.`,
            }
          })
          .sort((a, b) => b.score - a.score) // Sort descending by score
      : SAMPLE_LOCATIONS

  return (
    <main className="min-h-screen bg-background px-6 py-8 md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-sm">
          <div className="grid gap-4 bg-slate-50 p-5 md:grid-cols-[1.8fr_1fr]">
            <div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Location Rankings
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Based on your preferences.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={onBackToLocation} className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Change Location
                </Button>
                <Button variant="outline" size="sm" onClick={onBackToPreferences} className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Edit Weights
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/80 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Market Fit Gauge</p>
              <div className="mt-2 flex items-center gap-4">
                <svg width="112" height="112" viewBox="0 0 112 112" className="shrink-0">
                  <circle cx="56" cy="56" r="42" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle
                    cx="56"
                    cy="56"
                    r="42"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={gaugeCircumference}
                    strokeDashoffset={gaugeOffset}
                    transform="rotate(-90 56 56)"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-foreground">Low/Medium/High Potential</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Primary driver:{" "}
                    {primaryWeight ? `${primaryWeight[0]} (${percent(primaryWeight[1])}%)` : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Market Fit Score" value={`/100`} icon={Gauge} />
          <MetricCard 
            label="Best Candidate" 
            value={candidateLocations[0]?.name || "N/A"} 
            icon={Building2} 
          />
          <MetricCard
            label="Primary Driver"
            value={primaryWeight ? `${primaryWeight[0]} (${percent(primaryWeight[1])}%)` : "N/A"}
            icon={Sparkles}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Ranked Areas
            </h2>
            <div className="mt-4 space-y-4">
              {candidateLocations.map((location, index) => (
                <article
                  key={location.name}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Rank #{index + 1}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-foreground">{location.name}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{location.rationale}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Score</p>
                      <p className="text-3xl font-bold leading-none text-primary">{location.score}</p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${location.score}%` }}
                    />
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <p>Families: <span className="font-semibold text-foreground">{location.estimatedFamilies}</span></p>
                    <p>Income: <span className="font-semibold text-foreground">{location.medianIncome}</span></p>
                    <p>
                      Competition:{" "}
                      <span
                        className={cn(
                          "font-semibold",
                          location.competition === "Low" && "text-accent",
                          location.competition === "Medium" && "text-foreground",
                          location.competition === "High" && "text-destructive"
                        )}
                      >
                        {location.competition}
                      </span>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Weight Radar
              </h2>
              <div className="mt-4 flex items-center justify-center">
                <svg viewBox="0 0 240 240" className="h-56 w-56">
                  {[0.25, 0.5, 0.75, 1].map((level) => (
                    <polygon
                      key={level}
                      points={polygonAtRadius(5, 82 * level, 120, 120)}
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth="1"
                    />
                  ))}
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const angle = -Math.PI / 2 + (Math.PI * 2 * idx) / 5
                    const x = 120 + Math.cos(angle) * 82
                    const y = 120 + Math.sin(angle) * 82
                    return <line key={idx} x1="120" y1="120" x2={x} y2={y} stroke="#cbd5e1" strokeWidth="1" />
                  })}

                  <polygon
                    points={radarPoints(weightValues, 82, 120, 120)}
                    fill="rgba(37,99,235,0.28)"
                    stroke="#2563eb"
                    strokeWidth="2"
                  />
                  {VISUAL_WEIGHTS.map((item, idx) => {
                    const angle = -Math.PI / 2 + (Math.PI * 2 * idx) / 5
                    const outerX = 120 + Math.cos(angle) * 82
                    const outerY = 120 + Math.sin(angle) * 82
                    const valueX = 120 + Math.cos(angle) * 82 * weights[item.key]
                    const valueY = 120 + Math.sin(angle) * 82 * weights[item.key]
                    return (
                      <g key={item.key}>
                        <line
                          x1="120"
                          y1="120"
                          x2={valueX}
                          y2={valueY}
                          stroke={item.color}
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <circle cx={valueX} cy={valueY} r="4" fill={item.color} />
                        <circle cx={outerX} cy={outerY} r="2" fill={item.color} opacity="0.45" />
                      </g>
                    )
                  })}
                </svg>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                {VISUAL_WEIGHTS.map((item) => (
                  <div key={item.key} className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="ml-auto font-semibold text-foreground">{percent(weights[item.key])}%</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}

function WeightBar({
  label,
  value,
  barClass,
}: {
  label: string
  value: number
  barClass: string
}) {
  const width = percent(value)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{width}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full", barClass)} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}