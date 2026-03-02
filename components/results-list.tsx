"use client"

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export type CityResult = {
  city: string
  overallScore: number
  wealth: number
  family: number
  education: number
  competition: number
  accessibility: number
  percentile?: number
}

interface ResultsListProps {
  state: string | null
  results: CityResult[]
  onBack: () => void
}

function toPercent(value: number): number {
  const normalized = value <= 1 ? value * 100 : value
  return Math.max(0, Math.min(100, normalized))
}

function formatScore(value: number): string {
  return value.toFixed(2)
}

function FactorBar({ label, value }: { label: string; value: number }) {
  const percent = toPercent(value)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{percent.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export function ResultsList({ state, results, onBack }: ResultsListProps) {
  const topResults = results.slice(0, 5)

  return (
    <main className="min-h-screen bg-background px-6 py-8 md:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Results</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Top Cities {state ? `in ${state}` : ""}
            </h1>
          </div>
          <Button onClick={onBack} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </header>

        {topResults.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No results available for this state.
          </div>
        ) : (
          <div className="grid gap-4">
            {topResults.map((result, index) => (
              <article
                key={`${result.city}-${index}`}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Rank #{index + 1}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-foreground">{result.city}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Overall Score</p>
                    <p className="text-3xl font-bold leading-none text-primary">
                      {formatScore(result.overallScore)}
                    </p>
                    {typeof result.percentile === "number" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Percentile: {toPercent(result.percentile).toFixed(0)}%
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <FactorBar label="Wealth" value={result.wealth} />
                  <FactorBar label="Family" value={result.family} />
                  <FactorBar label="Education" value={result.education} />
                  <FactorBar label="Competition" value={result.competition} />
                  <FactorBar label="Accessibility" value={result.accessibility} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
