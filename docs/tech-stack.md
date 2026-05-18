# Tech Stack

This document visualizes the main technologies used in this repository.

```mermaid
flowchart LR
  Browser[Browser / Client]
  subgraph Frontend
    NextJS[Next.js (app/, React 18)]
    Tailwind[Tailwind CSS]
    Recharts[Recharts / html2canvas / jsPDF]
  end

  subgraph NodeLayer
    NodeServer[Node / Express (server.js, backend/chatRouter.js)]
    NextAPI[Next API routes (app/api/*)]
  end

  subgraph PythonBackend
    Flask[Flask app (flaskr/, backend/)]
    Evaluators[Python evaluators (morphology, wealth_distribution, ...)]
    Data[Data: DuckDB, Parquet, GeoPandas, Pandas, NumPy]
  end

  subgraph ThirdParty
    OpenAI[OpenAI API]
    External[Other APIs / Services]
  end

  Browser --> NextJS
  NextJS --> Tailwind
  NextJS --> Recharts
  NextJS -->|fetch / form posts| NextAPI
  NextAPI --> NodeServer
  NodeServer --> Flask
  NextAPI --> Flask
  Flask --> Evaluators
  Evaluators --> Data
  NodeServer --> OpenAI
  NextJS --> OpenAI
  Flask --> External

  classDef frontend fill:#e6fffa,stroke:#0ea5a3
  classDef backend fill:#eef2ff,stroke:#6366f1
  classDef data fill:#fff7ed,stroke:#f59e0b
  classDef third fill:#fff1f2,stroke:#ef4444
  class NextJS,Tailwind,Recharts frontend
  class NodeServer,NextAPI backend
  class Flask,Evaluators,Data data
  class OpenAI,External third
```

Summary

- Frontend: Next.js (App Router), React 18, Tailwind CSS, client libraries (Recharts, html2canvas, jsPDF).
- Node layer: `server.js` (Express), additional Node backend code under `backend/`.
- Python backend: Flask app in `flaskr/`, data tooling with Pandas, GeoPandas, DuckDB, PyArrow.
- Data & storage: Parquet files, DuckDB for querying, geopandas/shapely for geospatial.
- Third-party: OpenAI API and other external services.

Would you like an SVG/PNG export of the diagram or any changes to the layout?