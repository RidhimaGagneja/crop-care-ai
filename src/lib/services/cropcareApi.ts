/**
 * Centralized HTTP client for the CropCare FastAPI backend.
 *
 * - Uses VITE_API_BASE_URL from .env (default http://localhost:8000).
 * - POSTs multipart/form-data to /api/analyze (crop, analysis_type, image).
 * - Throws typed BackendApiError with the validation field when the backend
 *   returns 4xx / 5xx, so the Analyze page can show a friendly message and
 *   a retry CTA.
 *
 * Callers should import from `./cropcare.ts` instead of this file directly;
 * the `analyzeImage` entry point in `./cropcare.ts` orchestrates this API,
 * stores the result and returns a `StoredAnalysis` id for the Result page.
 */
import type {
  AnalysisMode,
  BackendAnalysisResponse,
  BackendApiError,
  CropId,
  WeatherNow,
} from "@/types";
import { crops as mockCrops } from "@/data/mock";

const DEFAULT_BASE_URL = "http://localhost:8000";

const MODE_TO_ANALYSIS_TYPE: Record<AnalysisMode, "disease" | "pest" | "both"> = {
  disease: "disease",
  pest: "pest",
  auto: "both",
};

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export function getApiBaseUrl(): string {
  const vite = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const value = vite?.["VITE_API_BASE_URL"];
  if (value && value.trim()) return value.replace(/\/$/, "");
  return DEFAULT_BASE_URL;
}

export function cropIdToApiCropName(cropId: CropId): string {
  const match = mockCrops.find((c) => c.id === cropId);
  return match?.name ?? cropId.slice(0, 1).toUpperCase() + cropId.slice(1);
}

export interface ImageValidationError {
  reason: "missing" | "invalid-type" | "too-large" | "empty";
  maxBytes?: number;
  allowedTypes?: string[];
  message: string;
}

export function validateImageForApi(file: File | null | undefined): ImageValidationError | null {
  if (!file) {
    return {
      reason: "missing",
      message: "Upload a leaf photo before running the analysis.",
    };
  }
  if (file.size <= 0) {
    return {
      reason: "empty",
      message: "The selected file is empty. Please choose a different image.",
    };
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
    return {
      reason: "invalid-type",
      allowedTypes: Array.from(ALLOWED_IMAGE_TYPES),
      message: `Unsupported image format (${file.type || "unknown"}). Use JPG, PNG or WebP.`,
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      reason: "too-large",
      maxBytes: MAX_IMAGE_BYTES,
      message: `This image is too large (${Math.round(file.size / 1024 / 1024)} MB). Choose one smaller than ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`,
    };
  }
  return null;
}

export async function analyzeImageApi(input: {
  cropId: CropId;
  mode: AnalysisMode;
  file: File;
  token: string;
  signal?: AbortSignal;
}): Promise<BackendAnalysisResponse> {
  const base = getApiBaseUrl();
  const form = new FormData();
  form.append("crop", cropIdToApiCropName(input.cropId));
  form.append("analysis_type", MODE_TO_ANALYSIS_TYPE[input.mode]);
  form.append("image", input.file, input.file.name);

  const controller = new AbortController();
  const manualSignal = controller.signal;
  if (input.signal) {
    if (input.signal.aborted) controller.abort();
    else input.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.token}` },
      body: form,
      signal: manualSignal,
    });
  } catch (err) {
    const networkErr: BackendApiError = {
      field: undefined,
      message:
        err instanceof Error && err.name === "AbortError"
          ? "Analysis was cancelled."
          : `Could not reach the CropCare backend at ${base}. Check it is running or your connection.`,
      statusCode: 0,
      error:
        err instanceof Error && err.name === "AbortError"
          ? "Request cancelled"
          : "Network error",
      detail: err instanceof Error ? err.message : String(err),
      rawBody: err instanceof Error ? err.message : String(err),
    };
    throw networkErr;
  }

  const rawText = await res.text();
  let parsed: unknown;
  try {
    parsed = rawText ? (JSON.parse(rawText) as unknown) : undefined;
  } catch {
    parsed = undefined;
  }

  if (!res.ok) {
    const error: BackendApiError = {
      statusCode: res.status,
      error: res.statusText || "HTTP error",
      rawBody: parsed ?? rawText,
    };
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj["detail"] === "object" && obj["detail"] !== null) {
        const d = obj["detail"] as Record<string, unknown>;
        if (typeof d["field"] === "string") error.field = d["field"];
        if (typeof d["message"] === "string") error.message = d["message"];
        error.detail = obj["detail"];
      } else if (typeof obj["detail"] === "string") {
        error.message = obj["detail"];
      }
      if (!error.message && typeof obj["message"] === "string") error.message = obj["message"];
    }
    if (!error.message) {
      error.message =
        res.status === 413
          ? "The uploaded image is too large for the server."
          : res.status >= 500
            ? "The backend service hit a problem. Please retry in a moment."
            : `Server returned status ${res.status}.`;
    }
    throw error;
  }

  if (!parsed || typeof parsed !== "object") {
    const bad: BackendApiError = {
      statusCode: res.status,
      error: "Invalid response",
      rawBody: parsed ?? rawText,
      message: "Unexpected response from the analysis service.",
    };
    throw bad;
  }

  const obj = parsed as Record<string, unknown>;
  return {
    id: typeof obj["id"] === "string" ? obj["id"] : undefined,
    created_at: typeof obj["created_at"] === "string" ? obj["created_at"] : undefined,
    prediction_type: (obj["prediction_type"] === "disease" || obj["prediction_type"] === "pest" || obj["prediction_type"] === "uncertain")
      ? obj["prediction_type"]
      : "disease",
    crop: typeof obj["crop"] === "string" ? obj["crop"] : "",
    condition: typeof obj["condition"] === "string" ? obj["condition"] : "Unknown",
    confidence: typeof obj["confidence"] === "number" ? obj["confidence"] : 0,
    severity: typeof obj["severity"] === "string" ? obj["severity"] : "unknown",
    symptoms: Array.isArray(obj["symptoms"]) ? (obj["symptoms"] as string[]) : [],
    recommendations: Array.isArray(obj["recommendations"]) ? (obj["recommendations"] as string[]) : [],
    explainability_image_url:
      typeof obj["explainability_image_url"] === "string" && obj["explainability_image_url"].trim()
        ? obj["explainability_image_url"].startsWith("http://") ||
          obj["explainability_image_url"].startsWith("https://") ||
          obj["explainability_image_url"].startsWith("data:")
          ? obj["explainability_image_url"]
          : `${base}${obj["explainability_image_url"].startsWith("/") ? "" : "/"}${obj["explainability_image_url"]}`
        : null,
    model_version: typeof obj["model_version"] === "string" ? obj["model_version"] : "unknown",
    status: obj["status"] === "ok" || obj["status"] === "error" ? obj["status"] : "ok",
  };
}

export interface AuthResult {
  user_id: string;
  email: string;
  name: string | null;
  access_token: string;
}

export async function signupApi(email: string, password: string, name: string): Promise<AuthResult> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const detail = body["detail"] as Record<string, unknown> | undefined;
    throw new Error((detail?.["message"] as string) ?? "Could not create your account.");
  }
  return body as unknown as AuthResult;
}

export async function loginApi(email: string, password: string): Promise<AuthResult> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const detail = body["detail"] as Record<string, unknown> | undefined;
    throw new Error((detail?.["message"] as string) ?? "Incorrect email or password.");
  }
  return body as unknown as AuthResult;
}

export async function healthCheckApi(signal?: AbortSignal): Promise<{ status: string; service: string }> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/health`, { signal: signal ?? null });
  if (!res.ok) throw new Error(`Health check failed with status ${res.status}.`);
  const json = (await res.json()) as { status?: string; service?: string };
  return { status: json.status ?? "unknown", service: json.service ?? "CropCare AI Backend" };
}

/**
 * Look up one previously saved analysis directly from the backend/database
 * by its id. Used so the Result page still works after a page refresh, when
 * the in-memory/session store no longer has the record.
 */
export async function fetchAnalysisById(
  id: string,
  token: string,
  signal?: AbortSignal,
): Promise<BackendAnalysisResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/analysis/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (!res.ok) {
    const notFound: BackendApiError = {
      field: undefined,
      statusCode: res.status,
      error: res.status === 404 ? "Not found" : "HTTP error",
      message:
        res.status === 404
          ? "No saved analysis was found with that id."
          : `Server returned status ${res.status}.`,
      detail: undefined,
      rawBody: undefined,
    };
    throw notFound;
  }

  const row = (await res.json()) as Record<string, unknown>;
  return parseSavedRow(row, id);
}

/**
 * Fetch this logged-in farmer's own analysis history from the real
 * database — not the local/demo session store.
 */
export async function fetchHistoryApi(
  token: string,
  limit = 50,
  signal?: AbortSignal,
): Promise<BackendAnalysisResponse[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/history?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) {
    throw new Error(`Could not load history (status ${res.status}).`);
  }
  const rows = (await res.json()) as Record<string, unknown>[];
  return rows.map((row) => parseSavedRow(row, typeof row["id"] === "string" ? row["id"] : ""));
}

function parseSavedRow(row: Record<string, unknown>, fallbackId: string): BackendAnalysisResponse {
  const result = (row["result"] && typeof row["result"] === "object" ? row["result"] : row) as Record<
    string,
    unknown
  >;

  return {
    id: typeof row["id"] === "string" ? row["id"] : fallbackId,
    created_at: typeof row["created_at"] === "string" ? row["created_at"] : undefined,
    prediction_type:
      result["prediction_type"] === "pest"
        ? "pest"
        : result["prediction_type"] === "uncertain"
          ? "uncertain"
          : "disease",
    crop: typeof result["crop"] === "string" ? (result["crop"] as string) : ((row["crop_name"] as string) ?? ""),
    condition:
      typeof result["condition"] === "string" ? (result["condition"] as string) : ((row["condition"] as string) ?? "Unknown"),
    confidence:
      typeof result["confidence"] === "number" ? (result["confidence"] as number) : ((row["confidence"] as number) ?? 0),
    severity:
      typeof result["severity"] === "string" ? (result["severity"] as string) : ((row["severity"] as string) ?? "unknown"),
    symptoms: Array.isArray(result["symptoms"]) ? (result["symptoms"] as string[]) : [],
    recommendations: Array.isArray(result["recommendations"]) ? (result["recommendations"] as string[]) : [],
    explainability_image_url:
      typeof result["explainability_image_url"] === "string" ? (result["explainability_image_url"] as string) : null,
    model_version: typeof result["model_version"] === "string" ? (result["model_version"] as string) : "unknown",
    status: result["status"] === "error" ? "error" : "ok",
  };
}

/** Raw envelope returned by GET /api/weather. */
interface BackendWeatherResponse {
  status: "ok" | "cached" | "unavailable";
  data: WeatherNow | null;
  message?: string | null;
}

/**
 * Fetch live weather from the FastAPI backend.
 *
 * Unlike `analyzeImageApi`, this never throws for provider-down
 * conditions — the backend itself absorbs Open-Meteo failures and
 * returns `status: "unavailable"` / `"cached"` with HTTP 200. This
 * function only throws for genuine transport failures (network down,
 * backend unreachable, bad JSON), which `getWeather()` in `cropcare.ts`
 * catches and falls back to the demo mock for.
 *
 * @param lat/lng - optional; omit to use the backend's demo default
 *   location (useful before geolocation capture resolves).
 */
export async function getWeatherApi(
  input: { lat?: number | undefined; lng?: number | undefined; signal?: AbortSignal | undefined } = {},
): Promise<BackendWeatherResponse> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams();
  if (typeof input.lat === "number") params.set("lat", String(input.lat));
  if (typeof input.lng === "number") params.set("lng", String(input.lng));
  const qs = params.toString();

  let res: Response;
  try {
    res = await fetch(`${base}/api/weather${qs ? `?${qs}` : ""}`, {
      signal: input.signal ?? null,
    });
  } catch (err) {
    throw new Error(
      err instanceof Error && err.name === "AbortError"
        ? "Weather request cancelled."
        : `Could not reach the CropCare backend at ${base} for weather.`,
    );
  }

  if (!res.ok) {
    // 400/422 = bad coordinates we sent; 5xx would be a real backend bug
    // (the route is designed to always return 200 for provider issues).
    throw new Error(`Weather request failed with status ${res.status}.`);
  }

  const rawText = await res.text();
  let parsed: unknown;
  try {
    parsed = rawText ? (JSON.parse(rawText) as unknown) : undefined;
  } catch {
    parsed = undefined;
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Unexpected response from the weather service.");
  }

  const obj = parsed as Record<string, unknown>;
  const status = obj["status"] === "ok" || obj["status"] === "cached" || obj["status"] === "unavailable"
    ? obj["status"]
    : "unavailable";
  const rawData = obj["data"];
  let data: WeatherNow | null = null;
  if (rawData && typeof rawData === "object") {
    const d = rawData as Record<string, unknown>;
    data = {
      temperatureC: typeof d["temperatureC"] === "number" ? d["temperatureC"] : 0,
      humidity: typeof d["humidity"] === "number" ? d["humidity"] : 0,
      rainfallMm: typeof d["rainfallMm"] === "number" ? d["rainfallMm"] : 0,
      windKph: typeof d["windKph"] === "number" ? d["windKph"] : 0,
      condition: typeof d["condition"] === "string" ? d["condition"] : "Unknown",
      location: typeof d["location"] === "string" ? d["location"] : "",
      updatedAt: typeof d["updatedAt"] === "string" ? d["updatedAt"] : new Date().toISOString(),
    };
  }

  return {
    status,
    data,
    message: typeof obj["message"] === "string" ? obj["message"] : null,
  };
}
