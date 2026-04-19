"use client"

import { useCallback, useState } from "react"
import { ArrowLeft, Info, Lock, Play, Unlock } from "lucide-react"
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts"
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

const CHART_COLOR = "#10b981"
const CHART_FILL = "rgba(16, 185, 129, 0.18)"

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

  const chartData = priorities.map((priority) => ({
    factor: priority.name.replace(" & ", " / "),
    shortLabel: priority.name.split(" ")[0],
    value: Math.round(weights[priority.id as WeightKey].value * 100),
    fullMark: 100,
    locked: weights[priority.id as WeightKey].locked,
  }))

  const activePresetConfig = presets.find((preset) => preset.id === activePreset)
  const presetDescription = activePresetConfig
    ? activePresetConfig.description
    : "Custom mix based on your current slider adjustments and any locked factors."

  const highestWeightedFactor = [...priorities]
    .sort(
      (a, b) =>
        weights[b.id as WeightKey].value - weights[a.id as WeightKey].value
    )[0]

  const lockedCount = Object.values(weights).filter((item) => item.locked).length

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <section className="flex flex-1 flex-col">
          <header className="border-b border-emerald-100/80 bg-white/80 px-6 py-4 backdrop-blur md:px-8">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  Choose your preferences
                </h1>
              </div>
              {onBack && (
                <Button
                  onClick={onBack}
                  variant="outline"
                  size="sm"
                  className="ml-auto gap-1.5 border-emerald-200 bg-white/70"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Location
                </Button>
              )}
            </div>
          </header>

          <div className="flex flex-1 flex-col justify-between px-6 py-8 md:px-8">
            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
              <div className="rounded-3xl border border-emerald-100 bg-white/85 p-6 shadow-[0_24px_80px_rgba(16,185,129,0.08)] backdrop-blur">
                <div className="max-w-2xl">
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    As you drag a slider, the polygon updates in real time using the same
                    five weight values that drive your scoring logic. Locked factors stay
                    fixed while the remaining sliders auto-balance to keep the total at 100%.
                  </p>
                </div>

                <div className="mt-8 h-[360px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={chartData}
                      outerRadius="70%"
                      margin={{ top: 24, right: 36, bottom: 24, left: 36 }}
                    >
                      <PolarGrid stroke="#b7e4d2" />
                      <PolarAngleAxis
                        dataKey="shortLabel"
                        tick={{ fill: "#0f172a", fontSize: 12, fontWeight: 600 }}
                      />
                      <Radar
                        dataKey="value"
                        stroke={CHART_COLOR}
                        fill={CHART_FILL}
                        fillOpacity={1}
                        strokeWidth={3}
                        isAnimationActive
                        animationDuration={250}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-4">
                <MetricCard
                  label="Top Priority"
                  value={highestWeightedFactor?.name ?? "N/A"}
                  caption={`${Math.round(
                    (highestWeightedFactor
                      ? weights[highestWeightedFactor.id as WeightKey].value
                      : 0) * 100
                  )}% of the final model`}
                />
                <MetricCard
                  label="Locked Factors"
                  value={`${lockedCount}`}
                  caption={
                    lockedCount > 0
                      ? "These values will not move during auto-balancing."
                      : "No factors are locked right now."
                  }
                />
                <MetricCard
                  label="Weight Total"
                  value={`${Math.round(totalWeight * 100)}%`}
                  caption={
                    isBalanced
                      ? "Your current mix is ready to submit."
                      : "Adjust the sliders until the total returns to 100%."
                  }
                  highlight={!isBalanced}
                />
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {chartData.map((item) => (
                <div
                  key={item.factor}
                  className="rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900">{item.shortLabel}</p>
                    {item.locked && (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                        Locked
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
                    {item.value}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="flex w-full flex-col border-t border-emerald-100 bg-white/95 lg:w-96 lg:border-l lg:border-t-0 xl:w-[450px]">
          <div className="flex flex-1 flex-col gap-6 overflow-auto p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Analysis Priorities</h2>
              <p className="mt-1 text-sm text-slate-600">
                Choose your preferences for the five scoring factors.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <p className="text-sm leading-6 text-emerald-900">
                  Drag sliders to rebalance your factors. Use the lock icon to freeze any
                  factor before adjusting the others, and the remaining unlocked factors
                  will auto-balance around it.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      activePreset === preset.id
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-sm italic leading-6 text-slate-500">{presetDescription}</p>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-600">Total Weight</span>
              <span
                className={cn(
                  "font-mono text-lg font-semibold",
                  isBalanced ? "text-emerald-600" : "text-destructive"
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

          <div className="border-t border-slate-200 p-6">
            <Button
              onClick={handleContinue}
              disabled={!isBalanced || isSubmitting}
              className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
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
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string
  caption: string
  highlight?: boolean
}

function MetricCard({ label, value, caption, highlight = false }: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border bg-white/85 p-5 shadow-sm",
        highlight ? "border-destructive/30" : "border-emerald-100"
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{caption}</p>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">{priority.name}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{priority.purpose}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="min-w-[3.25rem] justify-center font-mono text-xs">
            {percentage}%
          </Badge>
          <button
            onClick={onLockToggle}
            className={cn(
              "rounded-full border p-2 transition-colors",
              locked
                ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:text-emerald-700"
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
