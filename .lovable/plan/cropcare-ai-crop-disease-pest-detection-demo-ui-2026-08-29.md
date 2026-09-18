# CropCare AI — Crop Disease & Pest Detection (Demo UI)

A polished, responsive AgriTech web app for the SIH problem statement, built entirely on realistic mock data and clearly labelled as a demo. Structured so a FastAPI/PyTorch backend, database, and weather API can be plugged in later without rewriting the UI.

## Pages

1. **Landing (`/`)** — Hero with the problem framing, how it works in 3 steps (select crop → upload leaf photo → get action plan), supported crops, feature highlights, and a "Demo data" notice. Primary CTA into the app.
2. **Dashboard (`/dashboard`)** — Crop health score cards, active disease/pest alerts, today's weather panel, overall risk score gauge, recent analyses list, 30-day crop health trend chart (Recharts), and recommended actions.
3. **Analyze Crop (`/analyze`)** — Crop picker (Tomato, Potato, Maize, Wheat, Rice), analysis mode (Disease / Pest / Automatic), drag-and-drop + click upload with image preview and replace/remove, Analyze button with a staged loading state ("preprocessing → running model → generating advice"), then navigation to the result.
4. **Analysis Result (`/result/:id`)** — Uploaded image beside prediction: disease/pest name, confidence bar, severity badge, risk level, symptoms, immediate actions, prevention steps, environmental risk factors, and an attention/heat-map placeholder panel with an explainability note. Actions: save to history, analyze another.
5. **History (`/history`)** — Table/card list of past analyses with thumbnail, crop, prediction, confidence, severity, date; filter by crop and severity, search, and click-through to the result page.
6. **Risk Monitor (`/risk`)** — Current temperature, humidity, rainfall, wind cards; disease risk, pest risk, and environmental risk meters with plain-language interpretation; 7-day risk forecast chart; per-crop risk breakdown.
7. **Recommendations (`/recommendations`)** — Prioritised action cards (urgent / this week / preventive) grouped by crop, each with why-it-matters, steps, and organic vs chemical options, plus a safety disclaimer.

## Design

- Agriculture-inspired green palette (deep foliage green primary, warm earth accent, soil-neutral surfaces) defined as semantic tokens in `src/styles.css`; white/neutral cards with soft shadows.
- Modern typography pair loaded via `<link>` in the root route; shadcn-style components, Lucide icons, Recharts for all charts.
- Responsive app shell: collapsible sidebar on desktop, sheet drawer + bottom-safe header on mobile. Landing keeps its own marketing header.
- Subtle motion: card hover lift, staged fade-ins, animated progress/confidence bars, chart entry animation.
- Farmer-friendly copy: short sentences, plain-language severity ("Act today", "Watch closely"), no jargon-only labels.

## Demo-data honesty

Every prediction surface carries a visible "Demo prediction — sample data, not a real diagnosis" label. No accuracy percentages are presented as validated model metrics; confidence values are explicitly described as illustrative.

## Technical notes

- Mock data lives in `src/data/` (crops, diseases/pests catalogue, weather + risk series, history records, recommendations) with typed models in `src/types/`.
- All data access goes through a thin service layer in `src/lib/services/` returning promises with simulated latency, so each function can later be swapped for a FastAPI call, database query, or weather API without touching components.
- Uploaded images stay client-side via object URLs; a new analysis is generated deterministically from the crop + mode and stored in an in-memory/session store so History and Result pages stay consistent within a session.
- Routes follow TanStack file-based routing with a shared `_app` layout for the in-app pages; each route defines its own `head()` metadata.
- No auth, payments, IoT, or backend services in this build.
