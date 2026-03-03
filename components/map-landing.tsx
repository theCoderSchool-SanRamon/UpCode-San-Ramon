"use client"

import { useState, useRef, useEffect } from "react"
import { Search, MapPin, ChevronDown, Target } from "lucide-react"
import { usStates, preselectedCities } from "@/lib/mock-data"
import { USMap } from "@/components/us-map"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface SelectedLocation {
  name: string
  fullName: string
  state: string
  lat: number
  lng: number
}

interface MapLandingProps {
  onConfirmLocation: (location: SelectedLocation) => void
}

interface AutocompleteResult {
  display: string
  state: string
  lat: number
  lon: number
}

export function MapLanding({ onConfirmLocation }: MapLandingProps) {
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [confirmedLocation, setConfirmedLocation] =
    useState<SelectedLocation | null>(null)
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const stateDropdownRef = useRef<HTMLDivElement>(null)
  const suggestionListRef = useRef<HTMLUListElement>(null)
  const suggestionItemRefs = useRef<Array<HTMLLIElement | null>>([])

  const filteredSuggestions = suggestions.filter((result) => {
    if (!selectedState) return true
    const stateName = usStates.find((state) => state.abbr === selectedState)?.name
    const normalizedState = result.state.toLowerCase()
    return (
      normalizedState === selectedState.toLowerCase() ||
      normalizedState === (stateName || "").toLowerCase()
    )
  })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
      if (
        stateDropdownRef.current &&
        !stateDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStateDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (trimmedQuery.length <= 2) {
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
        const data = (await response.json()) as {
          results?: AutocompleteResult[]
        }
        setSuggestions(data.results || [])
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
  }, [query, selectedState])

  useEffect(() => {
    if (highlightIndex < 0) return
    suggestionItemRefs.current[highlightIndex]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    })
  }, [highlightIndex])

  function selectSuggestion(result: AutocompleteResult) {
    setQuery(result.display)
    const [name] = result.display.split(",")
    setConfirmedLocation({
      name: (name || result.display).trim(),
      fullName: result.display,
      state: selectedState || result.state,
      lat: result.lat,
      lng: result.lon,
    })
    setShowSuggestions(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIndex((prev) =>
        Math.min(prev + 1, filteredSuggestions.length - 1)
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (highlightIndex >= 0 && highlightIndex < filteredSuggestions.length) {
        selectSuggestion(filteredSuggestions[highlightIndex])
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
    }
  }

  function handleStateSelect(abbr: string) {
    setSelectedState((prev) => (prev === abbr ? null : abbr))
    setConfirmedLocation(null)
    setQuery("")
  }

  const selectedStateName = usStates.find(
    (s) => s.abbr === selectedState
  )?.name

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none tracking-tight text-foreground">
              theCoderSchool
            </span>
          </div>
        </div>

        <div className="mx-4 hidden h-5 w-px bg-border lg:block" />

        <div ref={wrapperRef} className="relative ml-auto flex-1 max-w-xl lg:ml-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowSuggestions(true)
              setHighlightIndex(-1)
              setConfirmedLocation(null)
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search by city, ZIP code, or address"
            className="h-9 w-full rounded-md border border-border bg-background pl-10 pr-4 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
            aria-label="Search locations"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-autocomplete="list"
          />

          {showSuggestions && query.trim().length > 2 && (
            <ul
              ref={suggestionListRef}
              role="listbox"
              className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-md border border-border bg-card shadow-lg"
            >
              {isLoadingSuggestions && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  Searching...
                </li>
              )}
              {!isLoadingSuggestions && filteredSuggestions.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  No matches found
                </li>
              )}
              {!isLoadingSuggestions &&
                filteredSuggestions.map((result, index) => (
                  <li
                    key={`${result.display}-${result.lat}-${result.lon}`}
                    ref={(el) => {
                      suggestionItemRefs.current[index] = el
                    }}
                    role="option"
                    aria-selected={highlightIndex === index}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 bg-white px-3 py-2 text-sm text-foreground transition-colors",
                      highlightIndex === index
                        ? "bg-gray-100"
                        : "hover:bg-gray-50"
                    )}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      selectSuggestion(result)
                    }}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {result.display}
                      </span>
                    </div>
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                      {result.lat.toFixed(2)}, {result.lon.toFixed(2)}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div ref={stateDropdownRef} className="relative">
          <button
            onClick={() => setShowStateDropdown(!showStateDropdown)}
            className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-secondary"
          >
            {selectedStateName || "All states"}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {showStateDropdown && (
            <div className="absolute right-0 z-20 mt-1 max-h-64 w-48 overflow-auto rounded-md border border-border bg-card shadow-lg">
              <button
                onClick={() => {
                  setSelectedState(null)
                  setShowStateDropdown(false)
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                  !selectedState
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                All states
              </button>
              {usStates.map((state) => (
                <button
                  key={state.abbr}
                  onClick={() => {
                    handleStateSelect(state.abbr)
                    setShowStateDropdown(false)
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                    selectedState === state.abbr
                      ? "bg-secondary font-medium text-foreground"
                      : "text-foreground"
                  )}
                >
                  {state.name} ({state.abbr})
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-8">
          <div className="w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <USMap
              selectedState={selectedState}
              onStateClick={handleStateSelect}
            />
          </div>

          {selectedState && (
            <p className="mt-4 text-sm text-muted-foreground">
              Showing cities in{" "}
              <span className="font-medium text-foreground">
                {selectedStateName}
              </span>
            </p>
          )}

          {!selectedState && !confirmedLocation && (
            <p className="mt-6 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
              Select a state on the map or search for a specific city
            </p>
          )}
        </div>

        <aside className="flex w-full flex-col border-t border-border bg-card p-6 lg:w-80 lg:border-l lg:border-t-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Target Location
          </h2>

          {confirmedLocation ? (
            <div className="mt-4 rounded-md border border-border bg-background p-4">
              <p className="text-base font-semibold text-foreground">
                {confirmedLocation.fullName}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {confirmedLocation.lat.toFixed(4)},{" "}
                {confirmedLocation.lng.toFixed(4)}
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-background p-8 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">
                No location selected
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Search or click the map to begin
              </p>
            </div>
          )}

          <div className="mt-auto pt-6">
            <Button
              onClick={() => {
                if (confirmedLocation) {
                  onConfirmLocation(confirmedLocation)
                }
              }}
              disabled={!confirmedLocation}
              className="w-full"
              size="lg"
            >
              Confirm Location
            </Button>
          </div>
        </aside>
      </div>
    </main>
  )
}
