"use client"

import { useState, useCallback } from "react"
import { MapPin, Lock, Unlock, Play, ArrowLeft } from "lucide-react"
import { priorities, presets, type Priority } from "@/lib/mock-data"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SelectedLocation } from "@/components/map-landing"

interface WeightState {
  value: number
  locked: boolean
}

interface AnalysisConfigProps {
  location: SelectedLocation
  onBack: () => void
  onRunAnalysis: (weights: Record<string, number>) => void
}

export function AnalysisConfig({ location, onBack, onRunAnalysis }: AnalysisConfigProps) {
  const [weights, setWeights] = useState<Record<string, WeightState>>(() => {
    const initial: Record<string, WeightState> = {}
    for (const p of priorities) {
      initial[p.id] = { value: p.defaultWeight, locked: false }
    }
    return initial
  })
  const [activePreset, setActivePreset] = useState<string>("default")

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w.value, 0)
  const isBalanced = Math.abs(totalWeight - 1) < 0.005

  const redistributeWeights = useCallback(
    (changedId: string, newValue: number, currentWeights: Record<string, WeightState>) => {
      const updated = { ...currentWeights }
      updated[changedId] = { ...updated[changedId], value: newValue }

      const lockedTotal = Object.entries(updated)
        .filter(([id, w]) => w.locked || id === changedId)
        .reduce((sum, [, w]) => sum + w.value, 0)

      const unlocked = Object.entries(updated).filter(
        ([id, w]) => !w.locked && id !== changedId
      )

      if (unlocked.length === 0) return updated

      const remainder = Math.max(0, 1 - lockedTotal)
      const unlockTotal = unlocked.reduce((sum, [, w]) => sum + w.value, 0)

      for (const [id, w] of unlocked) {
        const proportion = unlockTotal > 0 ? w.value / unlockTotal : 1 / unlocked.length
        updated[id] = { ...w, value: Math.max(0, proportion * remainder) }
      }

      return updated
    },
    []
  )

  function handleSliderChange(priorityId: string, values: number[]) {
    const newValue = values[0] / 100
    setWeights((prev) => redistributeWeights(priorityId, newValue, prev))
    setActivePreset("")
  }

  function handleLockToggle(priorityId: string) {
    setWeights((prev) => ({
      ...prev,
      [priorityId]: { ...prev[priorityId], locked: !prev[priorityId].locked },
    }))
  }

  function applyPreset(presetId: string) {
    const preset = presets.find((p) => p.id === presetId)
    if (!preset) return
    const newWeights: Record<string, WeightState> = {}
    for (const p of priorities) {
      newWeights[p.id] = {
        value: preset.weights[p.id] || 0,
        locked: false,
      }
    }
    setWeights(newWeights)
    setActivePreset(presetId)
  }

  function handleRunAnalysis() {
    const weightValues: Record<string, number> = {}
    for (const [id, w] of Object.entries(weights)) {
      weightValues[id] = Math.round(w.value * 100) / 100
    }
    onRunAnalysis(weightValues)
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-border bg-card px-6 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              theCoderSchool
            </span>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-secondary-foreground">
              <MapPin className="h-3.5 w-3.5" />
              Confirmed Location
            </div>
            <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {location.fullName}
            </h1>
            <p className="mt-2 font-mono text-sm text-muted-foreground">
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
            <p className="mx-auto mt-6 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
              Configure the analysis weights in the sidebar, then run the analysis to generate scores for this location.
            </p>
          </div>
        </div>
      </div>

      <aside className="flex w-full flex-col border-t border-border bg-card lg:w-96 lg:border-l lg:border-t-0">
        <div className="flex flex-col gap-6 overflow-auto p-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Analysis Priorities</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Adjust weights for each factor. Total must equal 100%.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  activePreset === preset.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-secondary"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Total Weight</span>
            <span
              className={cn(
                "font-mono text-sm font-semibold",
                isBalanced ? "text-accent" : "text-destructive"
              )}
            >
              {(totalWeight * 100).toFixed(0)}%
            </span>
          </div>

          <div className="flex flex-col gap-5">
            {priorities.map((priority) => (
              <PrioritySlider
                key={priority.id}
                priority={priority}
                value={weights[priority.id].value}
                locked={weights[priority.id].locked}
                onValueChange={(values) => handleSliderChange(priority.id, values)}
                onLockToggle={() => handleLockToggle(priority.id)}
              />
            ))}
          </div>
        </div>

        <div className="mt-auto border-t border-border p-6">
          <Button
            onClick={handleRunAnalysis}
            disabled={!isBalanced}
            className="w-full gap-2"
            size="lg"
          >
            <Play className="h-4 w-4" />
            Run Analysis
          </Button>
          {!isBalanced && (
            <p className="mt-2 text-center text-xs text-destructive">
              Weights must sum to 100% before running analysis.
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}


interface PrioritySliderProps {
  priority: Priority
  value: number
  locked: boolean
  onValueChange: (values: number[]) => void
  onLockToggle: () => void
}

function PrioritySlider({ priority, value, locked, onValueChange, onLockToggle }: PrioritySliderProps) {
  const percentage = Math.round(value * 100)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{priority.name}</p>
          <p className="text-xs text-muted-foreground">{priority.purpose}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="min-w-[3rem] justify-center font-mono text-xs"
          >
            {percentage}%
          </Badge>
          <button
            onClick={onLockToggle}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              locked
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            aria-label={locked ? `Unlock ${priority.name}` : `Lock ${priority.name}`}
          >
            {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <Slider
        value={[percentage]}
        onValueChange={onValueChange}
        max={100}
        step={1}
        disabled={locked}
        className={cn(locked && "opacity-50")}
      />
    </div>
  )
}
