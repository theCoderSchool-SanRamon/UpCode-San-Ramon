import { CandidateLocation, VISUAL_WEIGHTS } from "./analysis-screen"
import { Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface LocationComparisonProps {
  locations: CandidateLocation[]
}

export function LocationComparisonView({ locations }: LocationComparisonProps) {
  if (locations.length < 2) {
    return null
  }

  const validLocations = locations.filter((loc) => loc.rawScores)
  if (validLocations.length < 2) return null

  const maxTotalScore = Math.max(...validLocations.map((l) => l.score))

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-slate-50/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Side-by-Side Comparison
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Highlighting the strongest markets across your selected factors.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="min-w-[150px] bg-slate-50/50 p-4 font-medium text-muted-foreground">
                Factor
              </th>
              {validLocations.map((loc, idx) => {
                const isOverallWinner = loc.score === maxTotalScore
                return (
                  <th key={idx} className="min-w-[160px] border-l border-border p-4">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-foreground" title={loc.name}>
                        {loc.name.split(",")[0]}
                      </span>
                      {isOverallWinner && (
                        <Trophy className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className={cn("text-2xl font-bold", isOverallWinner ? "text-primary" : "text-foreground")}>
                        {loc.score}
                      </span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {VISUAL_WEIGHTS.map((factor) => {
              const maxScoreForFactor = Math.max(
                ...validLocations.map((l) => l.rawScores?.[factor.key as keyof typeof l.rawScores] || 0)
              )

              return (
                <tr key={factor.key} className="transition-colors hover:bg-slate-50/50">
                  <td className="p-4 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: factor.color }}
                      />
                      {factor.label}
                    </div>
                  </td>
                  {validLocations.map((loc, idx) => {
                    const score = loc.rawScores?.[factor.key as keyof typeof loc.rawScores] || 0
                    const isWinner = score === maxScoreForFactor && score > 0

                    return (
                      <td
                        key={idx}
                        className={cn(
                          "border-l border-border p-4 text-center font-mono",
                          isWinner ? factor.soft : ""
                        )}
                      >
                        <span className={cn(
                          isWinner ? "font-bold text-foreground" : "text-muted-foreground"
                        )}>
                          {score.toFixed(1)}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
