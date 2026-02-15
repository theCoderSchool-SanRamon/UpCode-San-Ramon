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
    description: "Balanced weighting across all factors",
    weights: {
      wealth: 0.25,
      family: 0.2,
      education: 0.2,
      competition: 0.15,
      accessibility: 0.2,
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


export interface CityOption {
  name: string
  state: string
  fullName: string
  lat: number
  lng: number
}

export const preselectedCities: CityOption[] = [
  { name: "New York", state: "NY", fullName: "New York, NY", lat: 40.7128, lng: -74.006 },
  { name: "Los Angeles", state: "CA", fullName: "Los Angeles, CA", lat: 34.0522, lng: -118.2437 },
  { name: "Chicago", state: "IL", fullName: "Chicago, IL", lat: 41.8781, lng: -87.6298 },
  { name: "Houston", state: "TX", fullName: "Houston, TX", lat: 29.7604, lng: -95.3698 },
  { name: "Phoenix", state: "AZ", fullName: "Phoenix, AZ", lat: 33.4484, lng: -112.074 },
  { name: "Philadelphia", state: "PA", fullName: "Philadelphia, PA", lat: 39.9526, lng: -75.1652 },
  { name: "San Antonio", state: "TX", fullName: "San Antonio, TX", lat: 29.4241, lng: -98.4936 },
  { name: "San Diego", state: "CA", fullName: "San Diego, CA", lat: 32.7157, lng: -117.1611 },
  { name: "Dallas", state: "TX", fullName: "Dallas, TX", lat: 32.7767, lng: -96.797 },
  { name: "Austin", state: "TX", fullName: "Austin, TX", lat: 30.2672, lng: -97.7431 },
  { name: "San Jose", state: "CA", fullName: "San Jose, CA", lat: 37.3382, lng: -121.8863 },
  { name: "Jacksonville", state: "FL", fullName: "Jacksonville, FL", lat: 30.3322, lng: -81.6557 },
  { name: "San Francisco", state: "CA", fullName: "San Francisco, CA", lat: 37.7749, lng: -122.4194 },
  { name: "Columbus", state: "OH", fullName: "Columbus, OH", lat: 39.9612, lng: -82.9988 },
  { name: "Indianapolis", state: "IN", fullName: "Indianapolis, IN", lat: 39.7684, lng: -86.1581 },
  { name: "Charlotte", state: "NC", fullName: "Charlotte, NC", lat: 35.2271, lng: -80.8431 },
  { name: "Seattle", state: "WA", fullName: "Seattle, WA", lat: 47.6062, lng: -122.3321 },
  { name: "Denver", state: "CO", fullName: "Denver, CO", lat: 39.7392, lng: -104.9903 },
  { name: "Nashville", state: "TN", fullName: "Nashville, TN", lat: 36.1627, lng: -86.7816 },
  { name: "Boston", state: "MA", fullName: "Boston, MA", lat: 42.3601, lng: -71.0589 },
  { name: "Portland", state: "OR", fullName: "Portland, OR", lat: 45.5152, lng: -122.6784 },
  { name: "Las Vegas", state: "NV", fullName: "Las Vegas, NV", lat: 36.1699, lng: -115.1398 },
  { name: "Memphis", state: "TN", fullName: "Memphis, TN", lat: 35.1495, lng: -90.049 },
  { name: "Louisville", state: "KY", fullName: "Louisville, KY", lat: 38.2527, lng: -85.7585 },
  { name: "Baltimore", state: "MD", fullName: "Baltimore, MD", lat: 39.2904, lng: -76.6122 },
  { name: "Milwaukee", state: "WI", fullName: "Milwaukee, WI", lat: 43.0389, lng: -87.9065 },
  { name: "Albuquerque", state: "NM", fullName: "Albuquerque, NM", lat: 35.0844, lng: -106.6504 },
  { name: "Tucson", state: "AZ", fullName: "Tucson, AZ", lat: 32.2226, lng: -110.9747 },
  { name: "Fresno", state: "CA", fullName: "Fresno, CA", lat: 36.7378, lng: -119.7871 },
  { name: "Sacramento", state: "CA", fullName: "Sacramento, CA", lat: 38.5816, lng: -121.4944 },
  { name: "Mesa", state: "AZ", fullName: "Mesa, AZ", lat: 33.4152, lng: -111.8315 },
  { name: "Atlanta", state: "GA", fullName: "Atlanta, GA", lat: 33.749, lng: -84.388 },
  { name: "Omaha", state: "NE", fullName: "Omaha, NE", lat: 41.2565, lng: -95.9345 },
  { name: "Raleigh", state: "NC", fullName: "Raleigh, NC", lat: 35.7796, lng: -78.6382 },
  { name: "Miami", state: "FL", fullName: "Miami, FL", lat: 25.7617, lng: -80.1918 },
  { name: "Cleveland", state: "OH", fullName: "Cleveland, OH", lat: 41.4993, lng: -81.6944 },
  { name: "Tampa", state: "FL", fullName: "Tampa, FL", lat: 27.9506, lng: -82.4572 },
  { name: "Minneapolis", state: "MN", fullName: "Minneapolis, MN", lat: 44.9778, lng: -93.265 },
  { name: "Pittsburgh", state: "PA", fullName: "Pittsburgh, PA", lat: 40.4406, lng: -79.9959 },
  { name: "Cincinnati", state: "OH", fullName: "Cincinnati, OH", lat: 39.1031, lng: -84.512 },
  { name: "St. Louis", state: "MO", fullName: "St. Louis, MO", lat: 38.627, lng: -90.1994 },
  { name: "Orlando", state: "FL", fullName: "Orlando, FL", lat: 28.5383, lng: -81.3792 },
  { name: "Palo Alto", state: "CA", fullName: "Palo Alto, CA", lat: 37.4419, lng: -122.143 },
  { name: "Boulder", state: "CO", fullName: "Boulder, CO", lat: 40.015, lng: -105.2705 },
  { name: "Detroit", state: "MI", fullName: "Detroit, MI", lat: 42.3314, lng: -83.0458 },
  { name: "Salt Lake City", state: "UT", fullName: "Salt Lake City, UT", lat: 40.7608, lng: -111.891 },
  { name: "Kansas City", state: "MO", fullName: "Kansas City, MO", lat: 39.0997, lng: -94.5786 },
  { name: "New Orleans", state: "LA", fullName: "New Orleans, LA", lat: 29.9511, lng: -90.0715 },
  { name: "Honolulu", state: "HI", fullName: "Honolulu, HI", lat: 21.3069, lng: -157.8583 },
  { name: "Scottsdale", state: "AZ", fullName: "Scottsdale, AZ", lat: 33.4942, lng: -111.9261 },
]
