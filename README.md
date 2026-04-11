api/ (Serverless Backend)

analyze.py: main Python Flask entry point. Vercel automatically routes POST requests from frontend here to execute serverless scoring logic.

app/ (Next.js Frontend)

api/: Contains Next.js native API routes (autocomplete/route.ts and recommend/route.ts).

globals.css: main stylesheet containing global Tailwind CSS rules.

layout.tsx: master React component that wraps entire application (navigation and standard headers).

page.tsx: primary UI page that loads when someone visits site.

backend/ (Python Logic & Data)

eval_access.py & eval_wealth.py: helper scripts for processing specific metric calculations.

query_acs.py: handles fetching demographic data from US Census API.

statewise_fips.py: mapping data for State FIPS codes used by  ensus.

vercel_analysis.py: runs live geospatial queries

components/ (React UI Elements)

ui/: reusable, foundational design components (buttons, sliders, cards).

analysis-config.tsx, analysis-screen.tsx, location-comparison-screen.tsx, location-comparison.tsx, location-detail.tsx, us-map.tsx: individual React that make up dashboard's visual interface.

lib/ (Utility Functions)

utils.ts: helper functions to merge Tailwind CSS classes dynamically.

Root Config Files

components.json: config for UI components.

next.config.mjs: settings for Next.js framework.

package.json / pnpm-lock.yaml: JavaScript dependencies of specific versions.

postcss.config.js / tailwind.config.ts: config files for Tailwind CSS.

requirements.txt: Python dependencies (Flask and requests) for Vercel.

tsconfig.json / global.d.ts / next-env.d.ts: config files that enforce TypeScript rules