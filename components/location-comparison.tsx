"use client"

import { useEffect, useMemo, useState } from "react"
import { VISUAL_WEIGHTS } from "./analysis-screen"
import { Trophy } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CandidateLocation } from "@/lib/analysis"

interface LocationComparisonProps {
  locations: CandidateLocation[]
}

export function LocationComparisonView({ locations }: LocationComparisonProps) {
  const validLocations = useMemo(
    () => locations.filter((loc) => loc.rawScores),
    [locations]
  )
  if (validLocations.length < 2) return null

  const maxSelectable = Math.min(validLocations.length, 5)
  const [compareCount, setCompareCount] = useState<number>(Math.min(2, maxSelectable))
  const [selectedNames, setSelectedNames] = useState<string[]>(
    validLocations.slice(0, Math.min(2, maxSelectable)).map((loc) => loc.name)
  )

  useEffect(() => {
    const nextCount = Math.min(Math.max(2, compareCount), maxSelectable)
    const nextNames = selectedNames.slice(0, nextCount)

    for (const location of validLocations) {
      if (nextNames.length >= nextCount) break
      if (!nextNames.includes(location.name)) {
        nextNames.push(location.name)
      }
    }

    if (
      nextCount !== compareCount ||
      nextNames.length !== selectedNames.length ||
      nextNames.some((name, index) => name !== selectedNames[index])
    ) {
      setCompareCount(nextCount)
      setSelectedNames(nextNames)
    }
  }, [compareCount, maxSelectable, selectedNames, validLocations])

  const selectedLocations = selectedNames
    .map((name) => validLocations.find((location) => location.name === name))
    .filter((location): location is CandidateLocation => Boolean(location))

  if (selectedLocations.length < 2) return null

  const maxTotalScore = Math.max(...selectedLocations.map((location) => location.score))

  function handleLocationChange(index: number, nextName: string) {
    setSelectedNames((current) => {
      const next = [...current]
      next[index] = nextName
      return next
    })
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/30 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Side-by-Side Comparison
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how many cities to compare and exactly which cities to show.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Number of Cities
            </p>
            <Select
              value={String(compareCount)}
              onValueChange={(value) => setCompareCount(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose city count" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxSelectable - 1 }, (_, index) => index + 2).map((count) => (
                  <SelectItem key={count} value={String(count)}>
                    {count} cities
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: compareCount }).map((_, index) => {
            const currentName = selectedNames[index]
            const availableLocations = validLocations.filter(
              (location) =>
                location.name === currentName || !selectedNames.includes(location.name)
            )

            return (
              <div key={index} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  City {index + 1}
                </p>
                <Select
                  value={currentName}
                  onValueChange={(value) => handleLocationChange(index, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Choose city ${index + 1}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLocations.map((location) => (
                      <SelectItem key={location.name} value={location.name}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="min-w-[150px] bg-muted/30 p-4 font-medium text-muted-foreground">
                Factor
              </th>
              {selectedLocations.map((loc, idx) => {
                const isOverallWinner = loc.score === maxTotalScore
                return (
                  <th key={idx} className="min-w-[160px] border-l border-border p-4">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-foreground" title={loc.name}>
                        {loc.name.split(",")[0]}
                      </span>
                      {isOverallWinner && (
                        <Trophy className="h-4 w-4 text-foreground" />
                      )}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">
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
              return (
                <tr key={factor.key}>
                  <td className="p-4 font-medium text-foreground">
                    {factor.label}
                  </td>
                  {selectedLocations.map((loc, idx) => {
                    const score = loc.rawScores?.[factor.key as keyof typeof loc.rawScores] || 0

                    return (
                      <td key={idx} className="border-l border-border p-4 text-center font-mono">
                        <span className="text-muted-foreground">{score.toFixed(1)}</span>
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
