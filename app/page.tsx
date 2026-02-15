"use client"

import { useState } from "react"
import { MapLanding, type SelectedLocation } from "@/components/map-landing"
import { AnalysisConfig } from "@/components/analysis-config"

type Screen = "map" | "config"

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("map")
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null)

  function handleConfirmLocation(location: SelectedLocation) {
    setSelectedLocation(location)
    setScreen("config")
  }

  function handleBack() {
    setScreen("map")
  }

  function handleRunAnalysis(weights: Record<string, number>) {
    // insert actual API call here, alert with results for now
    console.log("Running analysis with weights:", weights, "for location:", selectedLocation)
    alert(
      `Analysis started for ${selectedLocation?.fullName}\n\nWeights:\n${Object.entries(weights)
        .map(([k, v]) => `  ${k}: ${(v * 100).toFixed(0)}%`)
        .join("\n")}`
    )
  }

  return (
    <div className="relative min-h-screen">
      {screen === "map" && (
        <MapLanding onConfirmLocation={handleConfirmLocation} />
      )}

      {screen === "config" && selectedLocation && (
        <AnalysisConfig
          location={selectedLocation}
          onBack={handleBack}
          onRunAnalysis={handleRunAnalysis}
        />
      )}
    </div>
  )
}
