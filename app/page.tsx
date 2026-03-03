"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, MapPin, Search } from "lucide-react"
import { AnalysisConfig } from "@/components/analysis-config"
import { ResultsList, type CityResult } from "@/components/results-list"
import { USMap } from "@/components/us-map"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usStates } from "@/lib/mock-data"

type Weights = {
  wealth: number
  family: number
  education: number
  competition: number
  accessibility: number
}

type RecommendResponse = {
  results?: CityResult[]
}

type AutocompleteResult = {
  display: string
  state: string
  lat: number
  lon: number
}

const DEFAULT_WEIGHTS: Weights = {
  wealth: 0.3,
  family: 0.25,
  education: 0.1,
  competition: 0.2,
  accessibility: 0.15,
}

function isCityResult(value: unknown): value is CityResult {
  if (!value || typeof value !== "object") return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.city === "string" &&
    typeof candidate.overallScore === "number" &&
    typeof candidate.wealth === "number" &&
    typeof candidate.family === "number" &&
    typeof candidate.education === "number" &&
    typeof candidate.competition === "number" &&
    typeof candidate.accessibility === "number" &&
    (typeof candidate.percentile === "number" || typeof candidate.percentile === "undefined")
  )
}

function parseResults(payload: unknown): CityResult[] {
  if (!payload || typeof payload !== "object") return []

  const data = payload as RecommendResponse
  if (!Array.isArray(data.results)) return []

  return data.results.filter(isCityResult)
}

export default function HomePage() {
  const [step, setStep] = useState<"config" | "map" | "results">("config")
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS)
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [results, setResults] = useState<CityResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const searchWrapperRef = useRef<HTMLDivElement>(null)
  const suggestionItemRefs = useRef<Array<HTMLLIElement | null>>([])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (step !== "map" || trimmedQuery.length <= 2) {
      setSuggestions([])
      setIsLoadingSuggestions(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setIsLoadingSuggestions(true)
      try {
        const params = new URLSearchParams({ q: trimmedQuery })
        if (selectedState) {
          params.set("state", selectedState)
        }

        const response = await fetch(
          `/api/autocomplete?${params.toString()}`,
          { signal: controller.signal }
        )
        const payload = (await response.json()) as {
          results?: AutocompleteResult[]
        }
        setSuggestions(payload.results || [])
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSuggestions(false)
          setHighlightIndex(-1)
        }
      }
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [query, selectedState, step])

  useEffect(() => {
    if (highlightIndex < 0) return
    suggestionItemRefs.current[highlightIndex]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    })
  }, [highlightIndex])

  function handleConfigContinue(nextWeights: Weights) {
    setWeights(nextWeights)
    setError(null)
    setStep("map")
  }

  function handleStateSelect(state: string) {
    setSelectedState(state)
    setError(null)
  }

  async function handleViewTopPreferences() {
    if (!selectedState) {
      setError("Select a state from the map or search results first.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weights,
          state: selectedState,
        }),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const payload: unknown = await response.json()
      const parsedResults = parseResults(payload)
      setResults(parsedResults)
      setStep("results")
    } catch (err) {
      setResults([])
      setError(err instanceof Error ? err.message : "Failed to fetch recommendations")
    } finally {
      setLoading(false)
    }
  }

  function resolveStateAbbr(stateValue: string): string | null {
    const trimmed = stateValue.trim()
    if (!trimmed) return null

    const upper = trimmed.toUpperCase()
    if (usStates.some((state) => state.abbr === upper)) {
      return upper
    }

    const byName = usStates.find(
      (state) => state.name.toLowerCase() === trimmed.toLowerCase()
    )
    return byName?.abbr ?? null
  }

  function handleSuggestionSelect(suggestion: AutocompleteResult) {
    setQuery(suggestion.display)
    setShowSuggestions(false)

    const stateAbbr = resolveStateAbbr(suggestion.state)
    if (!stateAbbr) {
      setError("Could not resolve state for the selected location.")
      return
    }

    handleStateSelect(stateAbbr)
  }

  function handleSearchSubmit() {
    const firstSuggestion = suggestions[0]
    if (firstSuggestion) {
      handleSuggestionSelect(firstSuggestion)
      return
    }

    const stateAbbr = resolveStateAbbr(query)
    if (stateAbbr) {
      handleStateSelect(stateAbbr)
      return
    }

    setError("Select a suggestion or type a valid US state.")
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setHighlightIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setHighlightIndex((prev) => Math.max(prev - 1, -1))
      return
    }

    if (event.key === "Escape") {
      setShowSuggestions(false)
      return
    }

    if (event.key !== "Enter") return
    event.preventDefault()

    if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
      handleSuggestionSelect(suggestions[highlightIndex])
      return
    }

    handleSearchSubmit()
  }

  if (step === "config") {
    return (
      <AnalysisConfig
        initialWeights={weights}
        onContinue={handleConfigContinue}
      />
    )
  }

  if (step === "results") {
    return (
      <ResultsList
        state={selectedState}
        results={results}
        onBack={() => {
          setError(null)
          setStep("map")
        }}
      />
    )
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8 md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">State Selection</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Pick a state to get recommendations
            </h1>
          </div>
          <Button onClick={() => setStep("config")} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Preferences
          </Button>
        </header>

        <div ref={searchWrapperRef} className="relative z-[1100] max-w-3xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setShowSuggestions(true)
              setHighlightIndex(-1)
              setError(null)
            }}
            onFocus={() => {
              if (query.trim().length > 2) {
                setShowSuggestions(true)
              }
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search city, ZIP, or state"
            className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-24 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
            aria-label="Search locations"
          />
          <Button
            onClick={handleSearchSubmit}
            className="absolute right-1.5 top-1/2 h-7 -translate-y-1/2 px-3 text-xs"
            disabled={loading || query.trim().length === 0}
          >
            Search
          </Button>

          {showSuggestions && query.trim().length > 2 && (
            <ul className="absolute left-0 right-0 z-[1200] mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-md border border-border bg-card shadow-lg">
              {isLoadingSuggestions && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  Searching...
                </li>
              )}

              {!isLoadingSuggestions && suggestions.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  No matches found
                </li>
              )}

              {!isLoadingSuggestions &&
                suggestions.map((suggestion, index) => (
                  <li
                    key={`${suggestion.display}-${suggestion.lat}-${suggestion.lon}`}
                    ref={(element) => {
                      suggestionItemRefs.current[index] = element
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 bg-white px-3 py-2 text-sm text-foreground transition-colors",
                      highlightIndex === index
                        ? "bg-gray-100"
                        : "hover:bg-gray-50"
                    )}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      handleSuggestionSelect(suggestion)
                    }}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {suggestion.display}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {suggestion.lat.toFixed(2)}, {suggestion.lon.toFixed(2)}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-card px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Selected state:{" "}
            <span className="font-semibold text-foreground">
              {selectedState ?? "None"}
            </span>
          </p>
          <Button
            onClick={handleViewTopPreferences}
            disabled={!selectedState || loading}
          >
            See Top Preferences
          </Button>
        </div>

        {loading ? (
          <div className="flex min-h-[55vh] items-center justify-center rounded-xl border border-border bg-card">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-primary" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <USMap selectedState={selectedState} onStateClick={handleStateSelect} />
          </div>
        )}
      </div>
    </main>
  )
}
