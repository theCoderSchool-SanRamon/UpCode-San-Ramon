"use client"

import { useState, useRef, useEffect } from "react"
import { Search, MapPin, ChevronDown, Target } from "lucide-react"
import { usStates, preselectedCities, type CityOption } from "@/lib/mock-data"
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

export function MapLanding({ onConfirmLocation }: MapLandingProps) {
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [confirmedLocation, setConfirmedLocation] =
    useState<SelectedLocation | null>(null)
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const stateDropdownRef = useRef<HTMLDivElement>(null)

  const filteredCities = preselectedCities
    .filter((c) => {
      if (selectedState && c.state !== selectedState) return false
      if (query.length > 0) {
        const q = query.toLowerCase()
        return (
          c.name.toLowerCase().includes(q) ||
          c.fullName.toLowerCase().includes(q) ||
          c.state.toLowerCase().includes(q)
        )
      }
      return true
    })
    .slice(0, 8)

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

  function selectCity(city: CityOption) {
    setQuery(city.fullName)
    setConfirmedLocation({
      name: city.name,
      fullName: city.fullName,
      state: city.state,
      lat: city.lat,
      lng: city.lng,
    })
    setShowSuggestions(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIndex((prev) =>
        Math.min(prev + 1, filteredCities.length - 1)
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (highlightIndex >= 0 && highlightIndex < filteredCities.length) {
        selectCity(filteredCities[highlightIndex])
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

          {showSuggestions && filteredCities.length > 0 && (
            <ul
              role="listbox"
              className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-auto rounded-md border border-border bg-card shadow-lg"
            >
              {filteredCities.map((city, index) => (
                <li
                  key={`${city.name}-${city.state}`}
                  role="option"
                  aria-selected={highlightIndex === index}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm text-foreground transition-colors",
                    highlightIndex === index
                      ? "bg-secondary"
                      : "hover:bg-secondary/60"
                  )}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectCity(city)
                  }}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div>
                    <span className="font-medium">{city.name}</span>
                    <span className="text-muted-foreground">
                      , {city.state}
                    </span>
                  </div>
                  <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                    {city.lat.toFixed(2)}, {city.lng.toFixed(2)}
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
          <div className="w-full max-w-3xl">
            <USMap
              selectedState={selectedState}
              onSelectState={handleStateSelect}
            />
          </div>

          {selectedState && (
            <p className="mt-4 text-sm text-muted-foreground">
              Showing cities in{" "}
              <span className="font-medium text-foreground">
                {selectedStateName}
              </span>{" "}
              &middot;{" "}
              {
                preselectedCities.filter((c) => c.state === selectedState)
                  .length
              }{" "}
              pre-indexed
            </p>
          )}

          {!selectedState && !confirmedLocation && (
            <p className="mt-6 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
              Select a state on the map or search for a specific city to begin evaluating market viability for a new franchise site.
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
