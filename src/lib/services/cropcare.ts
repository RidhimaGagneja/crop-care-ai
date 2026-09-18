/**
 * Data access layer for CropCare AI.
 *
 * Legacy demo functions (`getAnalysis`, legacy `analyzeImage`) keep the existing
 * Result + History pages working against sample data.
 *
 * The new real path uses the FastAPI backend via `./cropcareApi`:
 *   - `analyzeImageWithBackend` → POST `/api/analyze` → stores a
 *     `StoredAnalysis.source === "backend"` record → returns its id.
 *   - `getAnyAnalysis` → returns `StoredAnalysis | undefined` (backend first,
 *     then the demo store) so the Result page can render either shape.
 */
import {
  alerts,
  crops,
  findings,
  findingById,
  healthTrend,
  recommendations,
  riskForecast,
  riskScores,
  sampleAnalyses,
  weatherNow,
} from "@/data/mock";
import type {
  Alert,
  Analysis,
  AnalysisMode,
  BackendAnalysisResponse,
  Crop,
  CropId,
  EnvFactor,
  Finding,
  HealthTrendPoint,
  Recommendation,
  RiskForecastPoint,
  RiskLevel,
  RiskScores,
  Severity,
  StoredAnalysis,
  WeatherNow,
} from "@/types";
import { API_SEVERITY_TO_SEVERITY } from "@/types";
import {
  analyzeImageApi,
  type BackendApiError,
  fetchAnalysisById,
  fetchHistoryApi,
  getWeatherApi,
  validateImageForApi,
  type ImageValidationError,
} from "./cropcareApi";

const delay = <T>(value: T, ms = 220) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

/** In-session store for analyses created by the user during the demo. */
const sessionAnalyses: Analysis[] = [];

/** In-session store for analyses that came back from the FastAPI backend. */
const backendAnalyses: Extract<StoredAnalysis, { source: "backend" }>[] = (() => {
  if (typeof window === "undefined") return [];
  try {
    const stored = sessionStorage.getItem("cropcare-backend-analyses");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
})();

function saveBackendAnalyses() {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem("cropcare-backend-analyses", JSON.stringify(backendAnalyses));
    } catch {
      // SessionStorage might be full or disabled
    }
  }
}

export type { BackendApiError, ImageValidationError };

export const getCrops = () => delay<Crop[]>(crops);

/** Where a `WeatherReading` actually came from, so the UI can be honest about it. */
export type WeatherSource = "live" | "cached" | "demo";

export type WeatherReading = WeatherNow & { source: WeatherSource };

/**
 * Live weather from the FastAPI backend, falling back to the static demo
 * reading (`weatherNow` in `@/data/mock`) if the backend is unreachable or
 * the provider has no data. Mirrors the backend-first/demo-fallback pattern
 * already used by `getAnyAnalysis`.
 *
 * Pass `lat`/`lng` from `useGeolocation()` (see `src/hooks/use-geolocation.ts`)
 * once the browser has granted location permission; omit them (or pass
 * `undefined`) to use the backend's default demo location. Call sites must
 * wrap this in an arrow function when using it as a TanStack Query
 * `queryFn` — e.g. `queryFn: () => getWeather(lat, lng)` — since React
 * Query calls bare `queryFn`s with its own context object, not `(lat, lng)`.
 *
 * The returned `source` field tells the UI what it's actually showing:
 *  - "live"  -> fresh reading from the weather provider just now
 *  - "cached"-> provider was briefly down, showing a recent-but-not-fresh reading
 *  - "demo"  -> backend/provider unreachable, showing the static sample data
 * Never label demo data as live, or live data as demo — surface `source`
 * in the UI wherever the weather card cites a source (see Dashboard).
 */
export async function getWeather(lat?: number, lng?: number): Promise<WeatherReading> {
  try {
    const resp = await getWeatherApi({ lat, lng });
    if (resp.status !== "unavailable" && resp.data) {
      return { ...resp.data, source: resp.status === "cached" ? "cached" : "live" };
    }
    // Backend reachable but has no data (provider down, no cache yet) —
    // fall through to the demo reading rather than showing an empty state.
    return { ...weatherNow, source: "demo" };
  } catch {
    // Backend unreachable entirely (not running, wrong port, network
    // error) — keep the UI usable with the demo reading instead of
    // crashing the Dashboard/Risk pages.
    const fallback = await delay<WeatherNow>(weatherNow, 0);
    return { ...fallback, source: "demo" };
  }
}

export const getRiskScores = () => delay<RiskScores>(riskScores);
export const getRiskForecast = () => delay<RiskForecastPoint[]>(riskForecast);
export const getHealthTrend = () => delay<HealthTrendPoint[]>(healthTrend);
export const getAlerts = () => delay<Alert[]>(alerts);
export const getRecommendations = () => delay<Recommendation[]>(recommendations);
export function getFinding(id: string): Finding | undefined {
  const match = findingById(id);
  if (match) return match;
  const titleCase = id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return {
    id,
    kind: id.includes("mite") || id.includes("pest") || id.includes("armyworm") || id.includes("whitefly") ? "pest" : "disease",
    name: titleCase,
    scientificName: titleCase,
    crops: ["tomato", "potato", "maize", "grape", "apple"],
    summary: `${titleCase} detected by CropCare AI.`,
    symptoms: ["Visual foliar symptoms detected on leaf surface."],
    immediateActions: ["Inspect affected plants and nearby foliage closely."],
    prevention: ["Follow recommended field sanitation and crop monitoring practices."],
    organicOptions: ["Neem oil spray"],
    chemicalOptions: ["Consult local agricultural extension"],
    favourableConditions: [],
  };
}

export { validateImageForApi, type BackendApiError } from "./cropcareApi";

export function getHistory(): Promise<Analysis[]> {
  const backendConverted: Analysis[] = backendAnalyses.map((b) => ({
    id: b.id,
    cropId: b.cropId,
    mode: b.mode,
    findingId: b.backend.condition.toLowerCase().replace(/\s+/g, "-"),
    confidence: Math.round(b.backend.confidence * 100),
    severity: (API_SEVERITY_TO_SEVERITY[b.backend.severity] || "unknown") as Severity,
    riskLevel: (b.backend.severity === "high" ? "high" : b.backend.severity === "low" ? "low" : "moderate") as RiskLevel,
    imageUrl: b.imageUrl,
    createdAt: b.createdAt,
    affectedArea: 0,
    envFactors: [],
    isSample: false,
  }));
  const all = [...backendConverted, ...sessionAnalyses, ...sampleAnalyses].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
  return delay(all);
}

export function getAnalysis(id: string): Promise<Analysis | undefined> {
  const found = [...sessionAnalyses, ...sampleAnalyses].find((a) => a.id === id);
  return delay(found ? withEnvFactors(found) : undefined, 120);
}

export async function getAnyAnalysis(id: string, token?: string): Promise<StoredAnalysis | undefined> {
  const backendMatch = backendAnalyses.find((a) => a.id === id);
  if (backendMatch) return delay(backendMatch, 60);

  const demoMatch = [...sessionAnalyses, ...sampleAnalyses].find((a) => a.id === id);
  if (demoMatch) return delay<StoredAnalysis>({ ...withEnvFactors(demoMatch), source: "demo" }, 60);

  if (!token) return undefined;

  // Not in this browser's memory (new tab, shared link, or a refresh that
  // cleared session storage) — ask the real backend/database directly
  // before giving up.
  try {
    const resp = await fetchAnalysisById(id, token);
    const record: Extract<StoredAnalysis, { source: "backend" }> = {
      id: resp.id ?? id,
      source: "backend",
      cropId: apiCropNameToCropId(resp.crop),
      mode: resp.prediction_type === "pest" ? "pest" : "disease",
      imageUrl: "",
      fileName: "",
      createdAt: resp.created_at ?? new Date().toISOString(),
      backend: resp,
    };
    backendAnalyses.unshift(record);
    return record;
  } catch {
    return undefined;
  }
}

/**
 * This logged-in farmer's real analysis history, fetched from the
 * database (not the local demo/session store).
 */
export async function getBackendHistory(
  token: string,
): Promise<Extract<StoredAnalysis, { source: "backend" }>[]> {
  const rows = await fetchHistoryApi(token);
  return rows.map((resp) => ({
    id: resp.id ?? `bk-${Math.random().toString(36).slice(2, 10)}`,
    source: "backend" as const,
    cropId: apiCropNameToCropId(resp.crop),
    mode: resp.prediction_type === "pest" ? "pest" : ("disease" as const),
    imageUrl: "",
    fileName: "",
    createdAt: resp.created_at ?? new Date().toISOString(),
    backend: resp,
  }));
}

function apiCropNameToCropId(name: string): CropId {
  const match = crops.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return match?.id ?? "tomato";
}

function severityFromArea(area: number): Severity {
  if (area >= 40) return "critical";
  if (area >= 25) return "high";
  if (area >= 10) return "moderate";
  return "low";
}

function riskFromSeverity(sev: Severity): RiskLevel {
  return sev === "critical" ? "severe" : sev === "high" ? "high" : sev === "moderate" ? "moderate" : "low";
}

function hashString(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) % 100000;
  return h;
}

function withEnvFactors(analysis: Analysis): Analysis {
  if (analysis.envFactors.length) return analysis;
  const finding = findingById(analysis.findingId);
  const factors: EnvFactor[] = [
    {
      label: "Humidity",
      value: `${weatherNow.humidity}%`,
      contribution: Math.min(96, weatherNow.humidity + 8),
      note: "High leaf wetness helps fungal spores germinate.",
    },
    {
      label: "Temperature",
      value: `${weatherNow.temperatureC}°C`,
      contribution: 71,
      note: finding?.favourableConditions[0] ?? "Within the favourable range for infection.",
    },
    {
      label: "Rainfall (last 24h)",
      value: `${weatherNow.rainfallMm} mm`,
      contribution: 64,
      note: "Rain splash carries spores from soil to lower leaves.",
    },
    {
      label: "Wind",
      value: `${weatherNow.windKph} km/h`,
      contribution: 38,
      note: "Light wind spreads spores slowly between plants.",
    },
  ];
  return { ...analysis, envFactors: factors };
}

/**
 * Demo inference. Kept for backwards compatibility with pages that have not
 * been switched to the FastAPI backend yet. New flows should use
 * `analyzeImageWithBackend`.
 */
export async function analyzeImage(input: {
  cropId: CropId;
  mode: AnalysisMode;
  imageUrl: string;
  fileName: string;
}): Promise<Analysis> {
  await delay(null, 2200);

  const pool = findings.filter(
    (f) =>
      f.crops.includes(input.cropId) &&
      f.id !== "healthy" &&
      (input.mode === "auto" || f.kind === input.mode),
  );
  const seed = hashString(input.fileName + input.cropId + input.mode);
  const healthy = findings.find((f) => f.id === "healthy")!;
  const finding = pool[seed % pool.length] ?? healthy;
  const isHealthy = finding.id === "healthy";
  const affectedArea = isHealthy ? 0 : 12 + (seed % 33);
  const severity = severityFromArea(affectedArea);
  const confidence = isHealthy ? 94 : 76 + (seed % 20);

  const analysis: Analysis = {
    id: `an-${Date.now().toString().slice(-6)}`,
    cropId: input.cropId,
    mode: input.mode,
    findingId: finding.id,
    confidence,
    severity,
    riskLevel: riskFromSeverity(severity),
    imageUrl: input.imageUrl,
    createdAt: new Date().toISOString(),
    affectedArea,
    envFactors: [],
    isSample: true,
  };

  const stored = withEnvFactors(analysis);
  sessionAnalyses.unshift(stored);
  return stored;
}

/**
 * Upload an image to the FastAPI backend at `POST /api/analyze` and store the
 * raw backend response in `backendAnalyses` for rendering on the Result page.
 *
 * Throws either:
 *   - `ImageValidationError` (client-side, never hits the network) when the
 *     image is missing / of wrong MIME / empty / too big.
 *   - `BackendApiError` when the network / backend returns a problem (field +
 *     message mirrors the backend's validation JSON).
 */
export async function analyzeImageWithBackend(input: {
  cropId: CropId;
  mode: AnalysisMode;
  imageUrl: string;
  fileName: string;
  file: File;
  token: string;
  signal?: AbortSignal;
}): Promise<Extract<StoredAnalysis, { source: "backend" }>> {
  const preValidation = validateImageForApi(input.file);
  if (preValidation) {
    // rethrow as a typed error so callers have one shape
    const err: BackendApiError = {
      field: "image",
      statusCode: 400,
      error: "Invalid image",
      message: preValidation.message,
      detail: preValidation,
    };
    throw err;
  }

  const resp: BackendAnalysisResponse = await analyzeImageApi({
    cropId: input.cropId,
    mode: input.mode,
    file: input.file,
    token: input.token,
    ...(input.signal !== undefined && { signal: input.signal }),
  });

  const record: Extract<StoredAnalysis, { source: "backend" }> = {
    id: resp.id ?? `bk-${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(2, 6)}`,
    source: "backend",
    cropId: input.cropId,
    mode: input.mode,
    imageUrl: input.imageUrl,
    fileName: input.fileName,
    createdAt: new Date().toISOString(),
    backend: resp,
  };
  backendAnalyses.unshift(record);
  saveBackendAnalyses();
  return record;
}
