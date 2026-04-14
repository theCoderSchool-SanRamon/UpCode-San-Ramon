"use client"

import { ArrowLeft, Calculator, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CandidateLocation, Weights, percent, VISUAL_WEIGHTS } from "@/components/analysis-screen"

interface LocationDetailProps {
  location: CandidateLocation
  weights: Weights
  onBack: () => void
}

export function LocationDetailScreen({ location, weights, onBack }: LocationDetailProps) {
  // Extract the raw scores passed from the Flask backend (fallback to 0 if loading/missing)
  const rawScores = location.rawScores || {
    wealth: 0,
    family: 0,
    education: 0,
    competition: 0,
    accessibility: 0,
  }

  // We will calculate the exact total to ensure the math matches perfectly on screen
  let calculatedTotal = 0

  function getFactorExplanation(
    factorKey: keyof Weights,
    factorLabel: string,
    factorScore: number,
    weightVal: number,
    contribution: number
  ) {
    const scoreBand =
      factorScore >= 80 ? "very strong" :
      factorScore >= 60 ? "solid" :
      factorScore >= 40 ? "mixed" :
      "weak"

    const factorSummary: Record<keyof Weights, string> = {
      wealth: "based on the area's income profile and concentration of higher-income households",
      family: "based on the area's concentration of families with school-age children",
      education: "based on district quality, education spending, and STEM-related indicators",
      competition: "based on how much nearby competition may affect this market",
      accessibility: "based on convenience factors like access, traffic, and ease of visiting",
    }

    return `${factorLabel} received a ${Math.round(factorScore)}/100 local score, which is ${scoreBand} ${factorSummary[factorKey]}. With your ${percent(weightVal)}% weight on this factor, it contributes ${contribution.toFixed(1)} points to the final score.`
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8 md:px-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack} 
          className="w-fit gap-2 pl-0 hover:bg-transparent hover:text-primary text-muted-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Rankings
        </Button>

        <header className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="h-5 w-5" />
                <p className="text-sm font-semibold uppercase tracking-widest">Score Breakdown</p>
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {location.name}
              </h1>
              <p className="mt-2 text-muted-foreground max-w-xl">
                Breakdown of how the final score of {location.score} was calculated.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl bg-primary/10 p-6 min-w-[140px] border border-primary/20">
              <p className="text-sm font-medium text-primary uppercase tracking-wider">Final Score</p>
              <p className="mt-1 text-5xl font-bold text-primary">{location.score}</p>
            </div>
          </div>
        </header>

        <div className="grid gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            Calculation Logic
          </h2>
          
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-4 bg-muted/50 p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="col-span-1">Factor</div>
              <div className="col-span-1 text-center">Your Weight</div>
              <div className="col-span-1 text-center">Local Area Score</div>
              <div className="col-span-1 text-right">Contribution</div>
            </div>
            
            <div className="divide-y divide-border">
              {VISUAL_WEIGHTS.map((item) => {
                const weightVal = weights[item.key as keyof Weights]
                const factorScore = rawScores[item.key as keyof Weights]
                
                // Weight (e.g., 0.30) * Factor Score (e.g., 85) = Contribution points
                const contribution = weightVal * factorScore
                calculatedTotal += contribution
                const explanation = getFactorExplanation(
                  item.key as keyof Weights,
                  item.label,
                  factorScore,
                  weightVal,
                  contribution
                )

                return (
                  <div
                    key={item.key}
                    className="group relative grid grid-cols-4 items-center p-4 text-sm transition-colors hover:bg-muted/20"
                    tabIndex={0}
                  >
                    <div className="col-span-1 font-medium text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {item.label}
                    </div>
                    
                    <div className="col-span-1 text-center font-mono text-muted-foreground">
                      {percent(weightVal)}%
                    </div>
                    
                    <div className="col-span-1 text-center font-mono text-muted-foreground">
                      {/* Show the real factor score, or -- if missing */}
                      {location.rawScores ? `${Math.round(factorScore)} / 100` : "-- / 100"}
                    </div>
                    
                    <div className="col-span-1 text-right font-mono font-semibold text-primary">
                      {/* Show the exact mathematical contribution */}
                      {location.rawScores ? `+ ${contribution.toFixed(1)} pts` : "+ -- pts"}
                    </div>

                    <div className="pointer-events-none absolute left-4 right-4 top-full z-10 mt-2 rounded-lg border border-border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                      {location.rawScores
                        ? explanation
                        : "Factor details will appear when raw scoring data is available."}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="bg-primary/5 p-4 border-t border-primary/20 flex justify-between items-center">
              <span className="font-semibold text-primary">Total Weighted Sum</span>
              <span className="text-2xl font-bold text-primary">
                {location.rawScores ? Math.round(calculatedTotal) : location.score}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
