"use client"

import { ArrowLeft } from "lucide-react"
import { LocationComparisonView } from "./location-comparison"
import { Button } from "@/components/ui/button"
import type { CandidateLocation } from "@/lib/analysis"

interface LocationComparisonScreenProps {
  locations: CandidateLocation[]
  onBack: () => void
}

export function LocationComparisonScreen({
  locations,
  onBack,
}: LocationComparisonScreenProps) {
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

        <header className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Side-by-Side Comparison
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Choose how many cities to compare and select the exact markets you want to review.
          </p>
        </header>

        <LocationComparisonView locations={locations} />
      </div>
    </main>
  )
}
