"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, Info, Lock, Play, Unlock } from "lucide-react"
import { priorities, presets, type Priority } from "@/lib/data"
import type { Weights } from "@/lib/analysis"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { WeightRadar } from "@/components/weight-radar"
import { cn } from "@/lib/utils"

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

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const savedWeights = window.localStorage.getItem("coderSchoolWeights")
      const savedPreset = window.localStorage.getItem("coderSchoolPreset")

      if (savedWeights) {
        setWeights(JSON.parse(savedWeights) as WeightMap)
      }

      if (savedPreset) {
        setActivePreset(JSON.parse(savedPreset) as string)
      }
    } catch (error) {
      console.error("Failed to hydrate saved analysis config:", error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      window.localStorage.setItem("coderSchoolWeights", JSON.stringify(weights))
      window.localStorage.setItem("coderSchoolPreset", JSON.stringify(activePreset))
    } catch (error) {
      console.error("Failed to persist analysis config:", error)
    }
  }, [weights, activePreset])

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

      const unlocked = entries.filter(([id, w]) => !w.locked && id !== changedId)

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

  const activePresetConfig = presets.find((preset) => preset.id === activePreset)
  const presetDescription = activePresetConfig
    ? activePresetConfig.description
    : "Choose a preset to get set slider adjustments for different prospectives."
  const normalizedWeights: Weights = {
    wealth: weights.wealth.value,
    family: weights.family.value,
    education: weights.education.value,
    competition: weights.competition.value,
    accessibility: weights.accessibility.value,
  }

  return (
    <div className="min-h-screen bg-white px-6 py-8 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[28px] border border-emerald-900/15 bg-white/90 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="grid gap-6 px-6 py-6 md:px-8 md:py-8 lg:grid-cols-[1.5fr_0.8fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
                Strategy Setup
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
                Choose your preferences
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                Shape how theCoderSchool Market Lens ranks each opportunity by adjusting
                the factors that matter most for your next location.

                Drag sliders to rebalance your factors. Lock any value before adjusting
                the others and the remaining unlocked factors will auto-balance.
              </p>
            </div>

            <div className="flex justify-end">
              {onBack && (
                <Button
                  onClick={onBack}
                  variant="outline"
                  size="sm"
                  className="w-fit gap-1.5 border-emerald-800 bg-white text-emerald-900 hover:bg-emerald-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Location
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.3fr)] lg:items-start">
          <div className="space-y-6 lg:sticky lg:top-6">
            <WeightRadar weights={normalizedWeights} />

            <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Presets
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      activePreset === preset.id
                        ? "border-emerald-800 bg-emerald-800 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-emerald-500 hover:bg-emerald-50"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">{presetDescription}</p>
            </div>

            <div className="flex items-center justify-between rounded-[28px] border border-slate-200/80 bg-white/90 px-5 py-4 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
              <span className="text-sm font-medium text-slate-600">Total Weight</span>
              <span
                className={cn(
                  "font-mono text-lg font-semibold",
                  isBalanced ? "text-emerald-700" : "text-destructive"
                )}
              >
                {(totalWeight * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_72px_-36px_rgba(15,23,42,0.42)] backdrop-blur md:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  Weight Controls
                </h2>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-5">
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

            <div className="mt-8 border-t border-slate-200 pt-6">
              <Button
                onClick={handleContinue}
                disabled={!isBalanced || isSubmitting}
                className="w-full gap-2 bg-emerald-800 text-white hover:bg-emerald-900"
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
          </div>
        </section>
      </div>
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

function PrioritySlider({
  priority,
  value,
  locked,
  onValueChange,
  onLockToggle,
}: PrioritySliderProps) {
  const percentage = Math.round(value * 100)

  return (
    <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdfc_100%)] p-5 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">{priority.name}</p>
          <p className="mt-1 text-xs leading-6 text-slate-500">{priority.purpose}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex min-w-[3.25rem] items-center justify-center rounded-full border border-emerald-800 bg-emerald-50 px-2.5 py-0.5 font-mono text-xs text-emerald-900"
          >
            {percentage}%
          </span>
          <button
            onClick={onLockToggle}
            className={cn(
              "rounded-full border p-2 transition-colors",
              locked
                ? "border-emerald-800 bg-emerald-800 text-white"
                : "border-emerald-800 bg-white text-emerald-900 hover:bg-emerald-50"
            )}
            aria-label={locked ? `Unlock ${priority.name}` : `Lock ${priority.name}`}
          >
            {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <Slider
          value={[percentage]}
          onValueChange={onValueChange}
          max={100}
          step={1}
          disabled={locked}
          className={cn(locked && "opacity-50")}
        />
      </div>
    </div>
  )
}
