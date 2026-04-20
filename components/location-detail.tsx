"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, Calculator, ChevronRight, MapPin, Pin, PinOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CandidateLocation, Weights, percent, VISUAL_WEIGHTS } from "@/components/analysis-screen"
import { cn } from "@/lib/utils"

interface LocationDetailProps {
  location: CandidateLocation
  weights: Weights
  onBack: () => void
}

type FactorDetail = {
  key: keyof Weights
  label: string
  weightVal: number
  factorScore: number
  contribution: number
  explanation: string
  hasRawScore: boolean
}

const EXIT_DELAY_MS = 180

export function LocationDetailScreen({ location, weights, onBack }: LocationDetailProps) {
  const [hoveredFactor, setHoveredFactor] = useState<keyof Weights | null>(null)
  const [selectedFactor, setSelectedFactor] = useState<keyof Weights | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rawScores = location.rawScores || {
    wealth: 0,
    family: 0,
    education: 0,
    competition: 0,
    accessibility: 0,
  }

  const factorDetails = useMemo<FactorDetail[]>(() => {
    return VISUAL_WEIGHTS.map((item) => {
      const key = item.key as keyof Weights
      const weightVal = weights[key]
      const factorScore = rawScores[key]
      const contribution = weightVal * factorScore

      return {
        key,
        label: item.label,
        weightVal,
        factorScore,
        contribution,
        explanation: getFactorExplanation(
          key,
          item.label,
          factorScore,
          weightVal,
          contribution
        ),
        hasRawScore: Boolean(location.rawScores),
      }
    })
  }, [location.rawScores, rawScores, weights])

  const calculatedTotal = factorDetails.reduce((sum, item) => sum + item.contribution, 0)
  const activeFactorKey = selectedFactor ?? hoveredFactor
  const activeDetail =
    factorDetails.find((item) => item.key === activeFactorKey) ?? factorDetails[0] ?? null
  const isPanelOpen = Boolean(activeFactorKey && activeDetail)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  function scheduleHoverClose() {
    clearCloseTimer()
    if (selectedFactor) return

    closeTimerRef.current = setTimeout(() => {
      setHoveredFactor(null)
      closeTimerRef.current = null
    }, EXIT_DELAY_MS)
  }

  function handleRowEnter(factorKey: keyof Weights) {
    clearCloseTimer()
    if (!selectedFactor) {
      setHoveredFactor(factorKey)
    }
  }

  function handleRowLeave() {
    scheduleHoverClose()
  }

  function handlePanelEnter() {
    clearCloseTimer()
  }

  function handlePanelLeave() {
    scheduleHoverClose()
  }

  function handleRowClick(factorKey: keyof Weights) {
    clearCloseTimer()
    setSelectedFactor((current) => (current === factorKey ? null : factorKey))
    setHoveredFactor(factorKey)
  }

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

        <header className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="h-5 w-5" />
                <p className="text-sm font-semibold uppercase tracking-widest">Score Breakdown</p>
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {location.name}
              </h1>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Breakdown of how the final score of {location.score} was calculated.
              </p>
            </div>

            <div className="flex min-w-[140px] flex-col items-center justify-center rounded-xl border border-primary/20 bg-primary/10 p-6">
              <p className="text-sm font-medium uppercase tracking-wider text-primary">Final Score</p>
              <p className="mt-1 text-5xl font-bold text-primary">{location.score}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            Calculation Logic
          </h2>

          <motion.div
            layout
            transition={{ layout: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } }}
            className="flex flex-col gap-4 lg:flex-row"
          >
            <motion.div
              layout
              transition={{ layout: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } }}
              className={cn("min-w-0", isPanelOpen ? "lg:basis-3/5" : "lg:basis-full")}
            >
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="grid grid-cols-4 bg-muted/50 p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <div className="col-span-1">Factor</div>
                  <div className="col-span-1 text-center">Your Weight</div>
                  <div className="col-span-1 text-center">Local Area Score</div>
                  <div className="col-span-1 text-right">Contribution</div>
                </div>

                <div className="divide-y divide-border">
                  {factorDetails.map((detail) => {
                    const isActive = activeFactorKey === detail.key
                    const isPinned = selectedFactor === detail.key

                    return (
                      <motion.button
                        key={detail.key}
                        layout
                        type="button"
                        onClick={() => handleRowClick(detail.key)}
                        onMouseEnter={() => handleRowEnter(detail.key)}
                        onMouseLeave={handleRowLeave}
                        className={cn(
                          "grid w-full grid-cols-4 items-center p-4 text-left text-sm transition-colors",
                          isActive ? "bg-primary/10" : "hover:bg-muted/20"
                        )}
                      >
                        <div className="col-span-1 flex items-center gap-2 font-medium text-foreground">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          <span>{detail.label}</span>
                          {isPinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                        </div>

                        <div className="col-span-1 text-center font-mono text-muted-foreground">
                          {percent(detail.weightVal)}%
                        </div>

                        <div className="col-span-1 text-center font-mono text-muted-foreground">
                          {detail.hasRawScore ? `${Math.round(detail.factorScore)} / 100` : "-- / 100"}
                        </div>

                        <div className="col-span-1 flex items-center justify-end gap-2 text-right font-mono font-semibold text-primary">
                          <span>
                            {detail.hasRawScore
                              ? `+ ${detail.contribution.toFixed(1)} pts`
                              : "+ -- pts"}
                          </span>
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isActive && "translate-x-0.5"
                            )}
                          />
                        </div>
                      </motion.button>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-primary/20 bg-primary/5 p-4">
                  <span className="font-semibold text-primary">Total Weighted Sum</span>
                  <span className="text-2xl font-bold text-primary">
                    {location.rawScores ? Math.round(calculatedTotal) : location.score}
                  </span>
                </div>
              </div>
            </motion.div>

            <AnimatePresence initial={false}>
              {isPanelOpen && activeDetail ? (
                <motion.div
                  key={activeDetail.key}
                  layout
                  initial={{ opacity: 0, x: 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  onMouseEnter={handlePanelEnter}
                  onMouseLeave={handlePanelLeave}
                  className="min-w-0 lg:basis-2/5"
                >
                  <div className="h-full rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
                          Factor Details
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                          {activeDetail.label}
                        </h3>
                      </div>
                      {selectedFactor === activeDetail.key ? (
                        <button
                          type="button"
                          onClick={() => setSelectedFactor(null)}
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800 transition-colors hover:border-emerald-800"
                        >
                          <PinOff className="h-3.5 w-3.5" />
                          Unpin
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedFactor(activeDetail.key)}
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800 transition-colors hover:border-emerald-800"
                        >
                          <Pin className="h-3.5 w-3.5" />
                          Pin
                        </button>
                      )}
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                      <DetailStat
                        label="Your Weight"
                        value={`${percent(activeDetail.weightVal)}%`}
                      />
                      <DetailStat
                        label="Local Score"
                        value={
                          activeDetail.hasRawScore
                            ? `${Math.round(activeDetail.factorScore)}/100`
                            : "-- / 100"
                        }
                      />
                      <DetailStat
                        label="Contribution"
                        value={
                          activeDetail.hasRawScore
                            ? `${activeDetail.contribution.toFixed(1)} pts`
                            : "-- pts"
                        }
                      />
                    </div>

                    <div className="mt-5 rounded-lg border border-emerald-100 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Explanation
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {activeDetail.hasRawScore
                          ? activeDetail.explanation
                          : "Factor details will appear when raw scoring data is available."}
                      </p>
                    </div>

                    <p className="mt-4 text-xs leading-6 text-slate-500">
                      Click a row to pin this panel open. Hovering over another row previews
                      that factor when nothing is pinned.
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </section>
      </div>
    </main>
  )
}

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

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-emerald-100 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}
