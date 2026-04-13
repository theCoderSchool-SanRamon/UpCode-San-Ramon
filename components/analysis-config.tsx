"use client"

import { useState, useCallback } from "react"
import { ArrowLeft, Lock, Unlock, Play } from "lucide-react"
import { priorities, presets, type Priority } from "@/lib/data"
import { Slider } from "@/components/ui/slider"
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

type WeightKey = keyof Weights

interface WeightState {
  value: number
  locked: boolean
}

type WeightMap = Record<WeightKey, WeightState>

interface AnalysisConfigProps {
  initialWeights: Weights
  onContinue: (weights: Weights) => void | Promise<void>
  onBack?: () => void
  continueLabel?: string
  isSubmitting?: boolean
  errorMessage?: string | null
}

export function AnalysisConfig({
  initialWeights,
  onContinue,
  onBack,
  continueLabel = "Continue",
  isSubmitting = false,
  errorMessage = null,
}: AnalysisConfigProps) {
  const [weights, setWeights] = useState<WeightMap>(() => {
    const byId = Object.fromEntries(
      priorities.map((priority) => [priority.id, priority.defaultWeight])
    ) as Record<string, number>

    return {
      wealth: { value: initialWeights.wealth ?? byId.wealth ?? 0, locked: false },
      family: { value: initialWeights.family ?? byId.family ?? 0, locked: false },
      education: { value: initialWeights.education ?? byId.education ?? 0, locked: false },
      competition: {
        value: initialWeights.competition ?? byId.competition ?? 0,
        locked: false,
      },
      accessibility: {
        value: initialWeights.accessibility ?? byId.accessibility ?? 0,
        locked: false,
      },
    }
  })
  const [activePreset, setActivePreset] = useState<string>("default")

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w.value, 0)
  const isBalanced = Math.abs(totalWeight - 1) < 0.005

  const redistributeWeights = useCallback(
    (changedId: WeightKey, newValue: number, currentWeights: WeightMap) => {
      const updated = { ...currentWeights }
      updated[changedId] = { ...updated[changedId], value: newValue }
      const entries = Object.entries(updated) as [WeightKey, WeightState][]

      const lockedTotal = entries
        .filter(([id, w]) => w.locked || id === changedId)
        .reduce((sum, [, w]) => sum + w.value, 0)

      const unlocked = entries.filter(
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

  function handleSliderChange(priorityId: WeightKey, values: number[]) {
    const newValue = values[0] / 100
    setWeights((prev) => redistributeWeights(priorityId, newValue, prev))
    setActivePreset("")
  }

  function handleLockToggle(priorityId: WeightKey) {
    setWeights((prev) => ({
      ...prev,
      [priorityId]: { ...prev[priorityId], locked: !prev[priorityId].locked },
    }))
  }

  function applyPreset(presetId: string) {
    const preset = presets.find((p) => p.id === presetId)
    if (!preset) return
    setWeights({
      wealth: { value: preset.weights.wealth || 0, locked: false },
      family: { value: preset.weights.family || 0, locked: false },
      education: { value: preset.weights.education || 0, locked: false },
      competition: { value: preset.weights.competition || 0, locked: false },
      accessibility: { value: preset.weights.accessibility || 0, locked: false },
    })
    setActivePreset(presetId)
  }

  function handleContinue() {
    onContinue({
      wealth: Math.round(weights.wealth.value * 100) / 100,
      family: Math.round(weights.family.value * 100) / 100,
      education: Math.round(weights.education.value * 100) / 100,
      competition: Math.round(weights.competition.value * 100) / 100,
      accessibility: Math.round(weights.accessibility.value * 100) / 100,
    })
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-border bg-card px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              theCoderSchool
            </span>
          </div>
          {onBack && (
            <Button onClick={onBack} variant="outline" size="sm" className="ml-auto gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Location
            </Button>
          )}
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="text-center">
            <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Set Your Preferences
            </h1>
            <p className="mx-auto mt-6 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
              Configure analysis weights for each factor. Continue to select a state and fetch city recommendations.
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
                value={weights[priority.id as WeightKey].value}
                locked={weights[priority.id as WeightKey].locked}
                onValueChange={(values) =>
                  handleSliderChange(priority.id as WeightKey, values)
                }
                onLockToggle={() => handleLockToggle(priority.id as WeightKey)}
              />
            ))}
          </div>
        </div>

        <div className="mt-auto border-t border-border p-6">
          <Button
            onClick={handleContinue}
            disabled={!isBalanced || isSubmitting}
            className="w-full gap-2"
            size="lg"
          >
            <Play className="h-4 w-4" />
            {continueLabel}
          </Button>
          {!isBalanced && (
            <p className="mt-2 text-center text-xs text-destructive">
              Weights must sum to 100% before continuing.
            </p>
          )}
          {errorMessage && (
            <p className="mt-2 text-center text-xs text-destructive">
              {errorMessage}
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
