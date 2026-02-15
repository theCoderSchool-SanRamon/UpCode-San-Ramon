"use client"

import { cn } from "@/lib/utils"

const STATE_PATHS: Record<string, string> = {
  WA: "M125,35 L170,30 L175,65 L130,70 Z",
  OR: "M115,65 L175,65 L170,105 L110,100 Z",
  CA: "M105,100 L135,100 L145,180 L110,200 L95,170 Z",
  NV: "M135,100 L165,100 L160,155 L140,170 L130,140 Z",
  ID: "M170,45 L195,40 L200,100 L170,105 Z",
  MT: "M195,30 L270,25 L265,60 L195,65 Z",
  WY: "M200,65 L265,60 L263,100 L200,103 Z",
  UT: "M165,100 L200,103 L198,155 L160,155 Z",
  CO: "M205,110 L268,107 L266,148 L205,150 Z",
  AZ: "M140,170 L165,155 L198,155 L195,210 L148,210 Z",
  NM: "M198,160 L260,155 L258,210 L195,215 Z",
  ND: "M270,25 L340,22 L338,55 L268,58 Z",
  SD: "M270,58 L338,55 L336,90 L268,93 Z",
  NE: "M270,95 L340,92 L338,118 L268,120 Z",
  KS: "M270,120 L345,118 L343,152 L268,154 Z",
  OK: "M275,155 L345,152 L348,182 L290,185 L275,175 Z",
  TX: "M260,185 L348,182 L355,260 L295,270 L260,230 Z",
  MN: "M340,22 L395,20 L393,70 L338,72 Z",
  IA: "M345,72 L400,70 L398,105 L343,107 Z",
  MO: "M345,107 L405,105 L408,150 L348,152 Z",
  AR: "M355,155 L405,152 L408,190 L358,192 Z",
  LA: "M360,195 L408,192 L415,230 L375,240 L360,220 Z",
  WI: "M395,20 L440,22 L438,65 L393,67 Z",
  IL: "M405,68 L435,66 L440,120 L410,125 Z",
  MI: "M440,22 L475,25 L465,70 L438,65 Z",
  IN: "M440,70 L465,70 L462,118 L438,120 Z",
  OH: "M465,60 L500,55 L498,105 L462,108 Z",
  KY: "M445,120 L505,110 L510,140 L450,145 Z",
  TN: "M410,145 L510,138 L512,162 L412,168 Z",
  MS: "M408,168 L435,165 L438,215 L410,218 Z",
  AL: "M438,165 L468,162 L470,215 L440,218 Z",
  GA: "M468,160 L510,155 L515,205 L472,210 Z",
  FL: "M475,210 L520,205 L540,250 L510,270 L480,240 Z",
  SC: "M510,150 L545,140 L530,170 L505,175 Z",
  NC: "M495,130 L555,120 L550,145 L500,150 Z",
  VA: "M490,110 L545,100 L555,120 L500,128 Z",
  WV: "M490,100 L510,95 L515,115 L495,118 Z",
  PA: "M490,65 L540,60 L542,88 L492,92 Z",
  NY: "M490,35 L545,25 L548,60 L492,65 Z",
  NJ: "M542,65 L555,62 L553,90 L540,92 Z",
  CT: "M548,48 L570,45 L568,58 L546,60 Z",
  RI: "M570,50 L580,48 L578,58 L568,60 Z",
  MA: "M550,38 L585,35 L582,48 L548,50 Z",
  VT: "M545,15 L558,13 L556,35 L543,37 Z",
  NH: "M558,10 L570,8 L568,35 L556,37 Z",
  ME: "M570,0 L595,0 L590,30 L568,32 Z",
  DE: "M543,80 L555,78 L554,92 L542,93 Z",
  MD: "M525,88 L545,85 L543,98 L523,100 Z",
  AK: "M60,250 L120,245 L125,280 L65,285 Z",
  HI: "M170,260 L210,255 L215,275 L175,280 Z",
}

interface USMapProps {
  selectedState: string | null
  onSelectState: (abbr: string) => void
}

export function USMap({ selectedState, onSelectState }: USMapProps) {
  return (
    <div className="relative w-full">
      <svg
        viewBox="40 -5 570 300"
        className="h-auto w-full"
        aria-label="Map of the United States"
        role="img"
      >
        {Object.entries(STATE_PATHS).map(([abbr, path]) => {
          const isSelected = selectedState === abbr
          return (
            <path
              key={abbr}
              d={path}
              onClick={() => onSelectState(abbr)}
              className={cn(
                "cursor-pointer transition-colors duration-150",
                isSelected
                  ? "fill-primary stroke-primary-foreground/40"
                  : "fill-secondary stroke-card hover:fill-primary/20"
              )}
              strokeWidth="1.5"
              role="button"
              aria-label={`Select ${abbr}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelectState(abbr)
                }
              }}
            />
          )
        })}
        {Object.entries(STATE_PATHS).map(([abbr]) => {
          const isSelected = selectedState === abbr
          if (!isSelected) return null
          const pathStr = STATE_PATHS[abbr]
          const nums = pathStr.match(/[\d.]+/g)?.map(Number) || []
          let cx = 0,
            cy = 0,
            count = 0
          for (let i = 0; i < nums.length; i += 2) {
            cx += nums[i]
            cy += nums[i + 1]
            count++
          }
          cx /= count
          cy /= count
          return (
            <text
              key={`label-${abbr}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none fill-primary-foreground text-[8px] font-semibold"
            >
              {abbr}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
