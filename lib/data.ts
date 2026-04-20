export interface Priority {
  id: string
  name: string
  purpose: string
  defaultWeight: number
}

export const priorities: Priority[] = [
  {
    id: "wealth",
    name: "Wealth Concentration",
    purpose: "Median household income and high-income household density",
    defaultWeight: 0.25,
  },
  {
    id: "family",
    name: "Family & Children Density",
    purpose: "Percentage of households with school-age children (5-17) within a 5-mile radius",
    defaultWeight: 0.2,
  },
  {
    id: "education",
    name: "Education Spending",
    purpose: "Per-pupil expenditure, district quality ratings, and STEM program adoption",
    defaultWeight: 0.2,
  },
  {
    id: "competition",
    name: "Competition in Vicinity",
    purpose: "Density of coding schools, tutoring centers, and other STEM programs within 5 miles",
    defaultWeight: 0.15,
  },
  {
    id: "accessibility",
    name: "Accessibility & Convenience",
    purpose: "Walk score, transit accessibility, traffic, parking lots",
    defaultWeight: 0.2,
  },
]

export interface Preset {
  id: string
  label: string
  description: string
  weights: Record<string, number>
}

export const presets: Preset[] = [
  {
    id: "default",
    label: "Default",
    description: "Default presets with standard weighted priorities",
    weights: {
      wealth: 0.3,
      family: 0.3,
      education: 0.15,
      competition: 0.15,
      accessibility: 0.1,
    },
  },
  {
    id: "low-risk",
    label: "Low Risk",
    description: "Prioritize areas with low competition",
    weights: {
      wealth: 0.35,
      family: 0.15,
      education: 0.15,
      competition: 0.25,
      accessibility: 0.1,
    },
  },
  {
    id: "family-first",
    label: "Family First",
    description: "Target areas dense with school-age children",
    weights: {
      wealth: 0.15,
      family: 0.35,
      education: 0.25,
      competition: 0.1,
      accessibility: 0.15,
    },
  },
  {
    id: "growth",
    label: "Growth",
    description: "Maximize accessibility and foot traffic potential",
    weights: {
      wealth: 0.2,
      family: 0.1,
      education: 0.15,
      competition: 0.2,
      accessibility: 0.35,
    },
  },
]

export interface USState {
  name: string
  abbr: string
}

export const usStates: USState[] = [
  { name: "Alabama", abbr: "AL" },
  { name: "Alaska", abbr: "AK" },
  { name: "Arizona", abbr: "AZ" },
  { name: "Arkansas", abbr: "AR" },
  { name: "California", abbr: "CA" },
  { name: "Colorado", abbr: "CO" },
  { name: "Connecticut", abbr: "CT" },
  { name: "Delaware", abbr: "DE" },
  { name: "Florida", abbr: "FL" },
  { name: "Georgia", abbr: "GA" },
  { name: "Hawaii", abbr: "HI" },
  { name: "Idaho", abbr: "ID" },
  { name: "Illinois", abbr: "IL" },
  { name: "Indiana", abbr: "IN" },
  { name: "Iowa", abbr: "IA" },
  { name: "Kansas", abbr: "KS" },
  { name: "Kentucky", abbr: "KY" },
  { name: "Louisiana", abbr: "LA" },
  { name: "Maine", abbr: "ME" },
  { name: "Maryland", abbr: "MD" },
  { name: "Massachusetts", abbr: "MA" },
  { name: "Michigan", abbr: "MI" },
  { name: "Minnesota", abbr: "MN" },
  { name: "Mississippi", abbr: "MS" },
  { name: "Missouri", abbr: "MO" },
  { name: "Montana", abbr: "MT" },
  { name: "Nebraska", abbr: "NE" },
  { name: "Nevada", abbr: "NV" },
  { name: "New Hampshire", abbr: "NH" },
  { name: "New Jersey", abbr: "NJ" },
  { name: "New Mexico", abbr: "NM" },
  { name: "New York", abbr: "NY" },
  { name: "North Carolina", abbr: "NC" },
  { name: "North Dakota", abbr: "ND" },
  { name: "Ohio", abbr: "OH" },
  { name: "Oklahoma", abbr: "OK" },
  { name: "Oregon", abbr: "OR" },
  { name: "Pennsylvania", abbr: "PA" },
  { name: "Rhode Island", abbr: "RI" },
  { name: "South Carolina", abbr: "SC" },
  { name: "South Dakota", abbr: "SD" },
  { name: "Tennessee", abbr: "TN" },
  { name: "Texas", abbr: "TX" },
  { name: "Utah", abbr: "UT" },
  { name: "Vermont", abbr: "VT" },
  { name: "Virginia", abbr: "VA" },
  { name: "Washington", abbr: "WA" },
  { name: "West Virginia", abbr: "WV" },
  { name: "Wisconsin", abbr: "WI" },
  { name: "Wyoming", abbr: "WY" },
]
