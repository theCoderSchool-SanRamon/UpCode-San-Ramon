# UpCode Prototype

UpCode Prototype is a Next.js application for ranking candidate markets for theCoderSchool expansion. It combines user-defined priority weights with live demographic, accessibility, and competition signals to produce scored location recommendations and pillar-level score explanations.

## Tech Stack

- Next.js 16 App Router
- React 18
- TypeScript
- Python
- Tailwind CSS
- Vercel serverless API routes
- U.S. Census ACS Data API
- Google Places API
- Mapbox Isochrone API

## Project Structure

```text
app/
  api/
    analyze/        Core scoring endpoint.
    autocomplete/   Location autocomplete endpoint.
    chat/           AI chat endpoint.
    recommend/      Frontend-facing recommendation endpoint.
  page.tsx          Main application flow.

backend/
  vercel_analysis.py  Python version of scoring helpers and geospatial analysis.
  eval_access.py      Accessibility utilities.
  eval_competition.py Competition utilities.
  query_acs.py        Census ACS query utilities.

components/
  analysis-config.tsx             Weight configuration UI.
  analysis-screen.tsx             Ranked results UI.
  location-detail.tsx             Pillar-level score explanation UI.
  location-comparison*.tsx        Comparison views.
  us-map.tsx                      State selection map.
  ui/                             Reusable UI primitives.

lib/
  analysis.ts    Shared analysis types and response normalization.
  data.ts        State and preference metadata.
  pdf-utils.ts   PDF export helpers.
  utils.ts       Shared utility helpers.
```

## Requirements

- Node.js 20 or newer
- pnpm
- Python 3.11 or newer
- API keys for production scoring

Install pnpm if needed:

```bash
npm install -g pnpm
```

## Environment Variables

Create a local `.env.local` file in the project root. This file is ignored by git and should not be committed.

```bash
CENSUS_API_KEY=
GOOGLE_API_KEY=
MAPBOX_TOKEN=
HUGGINGFACE_API_KEY=
NEXT_PUBLIC_CHAT_URL=/api/chat
```

Required for scoring:

- `CENSUS_API_KEY`: required for ACS demographic data such as income, household counts, child/family proxy values, and education estimates.
- `GOOGLE_API_KEY`: used by Google Places to estimate nearby competitors.
- `MAPBOX_TOKEN`: used by Mapbox Isochrone to estimate 15-minute drive-time population. Without this, accessibility scores fall back to `0` with a warning.

Required for chat:

- `HUGGINGFACE_API_KEY`: used by the Express chat server.

## Local Setup

Install dependencies:

```bash
pnpm install
```

Start the Next.js development server:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

The main app uses Next.js API routes under `app/api`. The separate Express server in `server.js` is only needed for the legacy `/api/chat` server flow:

```bash
pnpm start:server
```

## Development Workflow

Run TypeScript checks:

```bash
pnpm exec tsc --noEmit
```

Create a production build:

```bash
pnpm build
```

Start a production build locally:

```bash
pnpm build
pnpm start
```

## Scoring Flow

1. The user selects candidate locations and priority weights.
2. The frontend sends the request to `/api/recommend`.
3. `/api/recommend` normalizes the request and forwards it to `/api/analyze`.
4. `/api/analyze` gathers live signals:
   - Census ACS data for wealth, family, and education pillars.
   - Google Places data for competition.
   - Mapbox drive-time data for accessibility.
5. The API returns ranked locations with:
   - `score`
   - `rawScores`
   - `scoreMetrics`
   - user-facing rationale and warnings

## Vercel Deployment

1. Push changes to the GitHub repository connected to Vercel.

```bash
git add .
git commit -m "Describe the change"
git push origin main
```

2. In Vercel, confirm the project is connected to the correct repository and branch:

```text
Repository: 
Production branch: main
```

3. Add environment variables in Vercel:

```text
Project Settings -> Environment Variables
```

Add the required keys for both Production and Preview if both environments are used:

```bash
CENSUS_API_KEY
GOOGLE_API_KEY
MAPBOX_TOKEN
HUGGINGFACE_API_KEY
NEXT_PUBLIC_CHAT_URL
```

4. Redeploy after changing environment variables:

```text
Deployments -> latest deployment -> ... -> Redeploy
```
