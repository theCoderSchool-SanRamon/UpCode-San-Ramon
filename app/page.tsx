"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, Search, Plus, X } from "lucide-react"
import { AnalysisConfig } from "@/components/analysis-config"
import { AnalysisScreen, CandidateLocation } from "@/components/analysis-screen"
import { LocationComparisonScreen } from "@/components/location-comparison-screen"
import { LocationDetailScreen } from "@/components/location-detail"
import { USMap } from "@/components/us-map"
import { Button } from "@/components/ui/button"
import { usStates } from "@/lib/data"
import { cn } from "@/lib/utils"

type Weights = {
  wealth: number
  family: number
  education: number
  competition: number
  accessibility: number
}

type AutocompleteResult = {
  display: string
  state: string
  lat: number
  lon: number
}

const DEFAULT_WEIGHTS: Weights = {
  wealth: 0.3,
  family: 0.3,
  education: 0.15,
  competition: 0.15,
  accessibility: 0.1,
}

export default function HomePage() {
  const [step, setStep] = useState<"map" | "config" | "analysis" | "comparison" | "detail">("map")
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS)
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<AutocompleteResult | null>(null)
  const [locations, setLocations] = useState<AutocompleteResult[]>([])
  const [analysisResults, setAnalysisResults] = useState<CandidateLocation[]>([])
  const [detailLocation, setDetailLocation] = useState<CandidateLocation | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
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
    if (step !== "map" || !selectedState || trimmedQuery.length <= 2) {
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

  function handleStateSelect(state: string) {
    setSelectedState(state)
    setQuery("")
    setSuggestions([])
    setShowSuggestions(false)
    setHighlightIndex(-1)
    setSelectedCity((prev) => {
      if (!prev) return null
      const cityState = resolveStateAbbr(prev.state)
      return cityState === state ? prev : null
    })
    setError(null)
  }

  function handleAddLocation() {
    if (!selectedCity) return
    
    if (locations.length >= 5) {
      setError("You can only add up to 5 locations.")
      return
    }

    if (locations.some((loc) => loc.display === selectedCity.display)) {
      setError("Location already added.")
      return
    }

    setLocations((prev) => [...prev, selectedCity])
    setSelectedCity(null)
    setQuery("")
    setError(null)
  }

  async function handleSubmitPreferences(nextWeights: Weights) {
    if (locations.length === 0) {
      setError("Select at least one city first.")
      return
    }

    setWeights(nextWeights)
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weights: nextWeights,
          locations: locations.map((location) => ({
            name: location.display,
            lat: location.lat,
            lng: location.lon,
            state: location.state,
          })),
        }),
      })

      const payload = (await response.json()) as {
        error?: string
        results?: CandidateLocation[]
      }

      if (!response.ok) {
        throw new Error(payload.error || "Failed to analyze locations")
      }

      setAnalysisResults(payload.results || [])
      setStep("analysis")
    } catch (err) {
      setAnalysisResults([])
      setError(err instanceof Error ? err.message : "Failed to submit preferences")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleLocationContinue() {
    if (locations.length === 0) {
      setError("Select at least one city to continue.")
      return
    }

    setError(null)
    setStep("config")
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
    setSelectedCity(suggestion)
    setError(null)
  }

  function addSuggestionToLocations(suggestion: AutocompleteResult) {
    const suggestionState = resolveStateAbbr(suggestion.state)
    if (!suggestionState) {
      setError("Could not resolve state for the selected location.")
      return
    }

    if (!selectedState) {
      setError("Select a state first, then choose a city.")
      return
    }

    if (suggestionState !== selectedState) {
      setError("Choose a location in the selected state.")
      return
    }

    if (locations.length >= 5) {
      setError("You can only add up to 5 locations.")
      return
    }

    if (locations.some((loc) => loc.display === suggestion.display)) {
      setError("Location already added.")
      return
    }

    setSelectedCity(null)
    setLocations((prev) => [...prev, suggestion])
    setQuery("")
    setSuggestions([])
    setShowSuggestions(false)
    setHighlightIndex(-1)
    setError(null)
  }

  function handleSearchSubmit() {
    if (!selectedState) {
      setError("Select a state first, then choose a city.")
      return
    }

    const firstSuggestion = suggestions[0]
    if (firstSuggestion) {
      addSuggestionToLocations(firstSuggestion)
      return
    }

    setError("Select a valid city from search suggestions.")
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

    if (!selectedState) {
      setError("Select a state first, then choose a city.")
      return
    }

    if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
      addSuggestionToLocations(suggestions[highlightIndex])
      return
    }

    handleSearchSubmit()
  }

  function handleSelectLocation(location: CandidateLocation) {
    setDetailLocation(location)
    setStep("detail")
  }

  if (step === "config") {
    return (
      <AnalysisConfig
        initialWeights={weights}
        onContinue={handleSubmitPreferences}
        onBack={() => {
          setError(null)
          setStep("map")
        }}
        continueLabel={isSubmitting ? "Submitting..." : "Submit"}
        isSubmitting={isSubmitting}
        errorMessage={error}
      />
    )
  }

  if (step === "analysis") {
    return (
      <AnalysisScreen
        selectedState={locations[0] ? resolveStateAbbr(locations[0].state) : selectedState}
        selectedCity={locations[0]?.display ?? null}
        selectedCities={locations}
        realData={analysisResults}
        weights={weights}
        onOpenComparison={() => setStep("comparison")}
        onSelectLocation={handleSelectLocation}
        onBackToPreferences={() => {
          setError(null)
          setStep("config")
        }}
        onBackToLocation={() => {
          setError(null)
          setStep("map")
        }}
      />
    )
  }

  if (step === "comparison") {
    return (
      <LocationComparisonScreen
        locations={analysisResults}
        onBack={() => setStep("analysis")}
      />
    )
  }

  if (step === "detail" && detailLocation) {
    return (
      <LocationDetailScreen 
        location={detailLocation} 
        weights={weights} 
        onBack={() => setStep("analysis")} 
      />
    )
  }

  const selectedStateName = usStates.find((state) => state.abbr === selectedState)?.name

  return (
    <main className="min-h-screen bg-background px-6 py-8 md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">State Selection</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Pick locations to get recommendations
            </h1>
            <div className="mt-4 max-w-3xl rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
              <p>
                First, select a state on the map. Then use the search bar to search for an address, choose an option from the dropdown,
                and press <span className="font-semibold text-foreground">Enter</span> to add that location.
                Once you have all the locations you want, press <span className="font-semibold text-foreground">Confirm Locations</span>.
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 lg:flex-row">
          <div className="flex-1">
            <div ref={searchWrapperRef} className="relative z-[1100]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setShowSuggestions(true)
                  setHighlightIndex(-1)
                  setSelectedCity(null)
                  setError(null)
                }}
                onFocus={() => {
                  if (selectedState && query.trim().length > 2) {
                    setShowSuggestions(true)
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={
                  selectedState
                    ? `Search address in ${selectedState}`
                    : "Select a state first to search address"
                }
                className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-4 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-primary/20"
                aria-label="Search locations"
              />

              {showSuggestions && selectedState && query.trim().length > 2 && (
                <ul className="absolute left-0 right-0 z-[1200] mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-md border border-border bg-card shadow-lg">
                  {isLoadingSuggestions && (
                    <li className="px-3 py-2 text-sm text-muted-foreground">
                      Searching...
                    </li>
                  )}

                  {!isLoadingSuggestions && suggestions.length === 0 && (
                    <li className="px-3 py-2 text-sm text-muted-foreground">
                      No matches found in {selectedState}
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

            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <USMap selectedState={selectedState} onStateClick={handleStateSelect} />
            </div>
          </div>

          <aside className="flex w-full flex-col rounded-xl border border-border bg-card p-6 lg:w-80">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Target Location
            </h2>
            <div className="mt-4 rounded-md border border-border bg-background p-4 text-sm">
              <p className="text-muted-foreground">State</p>
              <p className="font-semibold text-foreground">
                {selectedStateName ? `${selectedStateName} (${selectedState})` : "None"}
              </p>
              <p className="mt-3 text-muted-foreground">Address</p>
              <p className="font-semibold text-foreground">
                {selectedCity?.display ?? "None"}
              </p>
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                {selectedCity
                  ? `${selectedCity.lat.toFixed(4)}, ${selectedCity.lon.toFixed(4)}`
                  : "Lat/Lng unavailable"}
              </p>
            </div>

            <Button
              variant="outline"
              className="mt-4 w-full gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
              disabled={
                !selectedCity ||
                resolveStateAbbr(selectedCity.state) !== selectedState ||
                locations.length >= 5
              }
              onClick={handleAddLocation}
            >
              <Plus className="h-4 w-4" />
              Add Location
            </Button>

            {locations.length > 0 && (
              <div className="mt-6 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Added Locations ({locations.length}/5)
                  </h3>
                </div>
                {locations.map((loc, idx) => (
                  <div key={`${loc.display}-${idx}`} className="group relative flex items-start justify-between rounded-md border border-border bg-background p-3 text-sm transition-colors hover:border-destructive/50">
                    <div className="min-w-0 pr-6">
                      <p className="truncate font-semibold text-foreground" title={loc.display}>
                        {loc.display}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
                      </p>
                    </div>
                    <button
                      onClick={() => setLocations((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute right-3 top-3 text-muted-foreground opacity-50 transition-opacity hover:text-destructive group-hover:opacity-100"
                      aria-label="Remove city"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-md border border-destructive/30 bg-card px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="mt-auto pt-6">
              <Button
                onClick={handleLocationContinue}
                disabled={locations.length === 0}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                size="lg"
              >
                Confirm Locations
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
