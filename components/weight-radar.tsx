"use client"

import { percent, VISUAL_WEIGHTS } from "@/components/analysis-screen"
import type { Weights } from "@/lib/analysis"

function radarPoints(values: number[], radius: number, cx: number, cy: number): string {
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length
      const x = cx + Math.cos(angle) * radius * value
      const y = cy + Math.sin(angle) * radius * value
      return `${x},${y}`
    })
    .join(" ")
}

function polygonAtRadius(points: number, radius: number, cx: number, cy: number): string {
  return Array.from({ length: points })
    .map((_, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / points
      const x = cx + Math.cos(angle) * radius
      const y = cy + Math.sin(angle) * radius
      return `${x},${y}`
    })
    .join(" ")
}

export function WeightRadar({ weights }: { weights: Weights }) {
  const weightValues = VISUAL_WEIGHTS.map((item) => weights[item.key as keyof Weights])

  return (
    <div className="rounded-2xl border border-emerald-800 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
        Weight Radar
      </h2>
      <div className="mt-4 flex items-center justify-center">
        <svg viewBox="0 0 240 240" className="h-56 w-56">
          {[0.25, 0.5, 0.75, 1].map((level) => (
            <polygon
              key={level}
              points={polygonAtRadius(5, 82 * level, 120, 120)}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 5 }).map((_, idx) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * idx) / 5
            const x = 120 + Math.cos(angle) * 82
            const y = 120 + Math.sin(angle) * 82
            return <line key={idx} x1="120" y1="120" x2={x} y2={y} stroke="#cbd5e1" strokeWidth="1" />
          })}

          <polygon
            points={radarPoints(weightValues, 82, 120, 120)}
            fill="currentColor"
            fillOpacity="0.2"
            stroke="currentColor"
            strokeWidth="2"
            className="text-emerald-700"
          />
          {VISUAL_WEIGHTS.map((item, idx) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * idx) / 5
            const outerX = 120 + Math.cos(angle) * 82
            const outerY = 120 + Math.sin(angle) * 82
            const valueX = 120 + Math.cos(angle) * 82 * weights[item.key as keyof Weights]
            const valueY = 120 + Math.sin(angle) * 82 * weights[item.key as keyof Weights]
            return (
              <g key={item.key}>
                <line
                  x1="120"
                  y1="120"
                  x2={valueX}
                  y2={valueY}
                  stroke={item.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx={valueX} cy={valueY} r="4" fill={item.color} />
                <circle cx={outerX} cy={outerY} r="2" fill={item.color} opacity="0.45" />
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        {VISUAL_WEIGHTS.map((item) => (
          <div key={item.key} className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-slate-600">{item.label}</span>
            <span className="ml-auto font-semibold text-slate-900">{percent(weights[item.key as keyof Weights])}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
