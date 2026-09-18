export type CropId = "tomato" | "potato" | "maize" | "grape" | "apple";

export type AnalysisMode = "disease" | "pest" | "auto";

export type Severity = "low" | "moderate" | "high" | "critical" | "unknown";

export type RiskLevel = "low" | "moderate" | "high" | "severe";

export const API_SEVERITY_TO_SEVERITY: Record<string, Severity> = {
  low: "low",
  medium: "moderate",
  high: "high",
  unknown: "unknown",
};

/** Raw response shape returned by the FastAPI backend POST /api/analyze. */
export interface BackendAnalysisResponse {
  id?: string;
  created_at?: string;
  prediction_type: "disease" | "pest" | "uncertain";
  crop: string;
  condition: string;
  confidence: number; // 0..1
  severity: string; // "low" | "medium" | "high" | "unknown" etc
  symptoms: string[];
  recommendations: string[];
  explainability_image_url: string | null;
  model_version: string;
  status: "ok" | "error";
}

export interface BackendApiError {
  field: string | undefined;
  message: string | undefined;
  statusCode: number | undefined;
  error: string | undefined;
  detail: unknown;
  rawBody: unknown;
}

/**
 * A stored analysis can be either:
 *  - the existing frontend-only Analysis (populated from demo data / session), or
 *  - a remote backend analysis that stores the raw BackendAnalysisResponse alongside
 *    the uploaded preview image so the Result page can render backend payloads directly.
 */
export type StoredAnalysis =
  | ({ source: "demo" } & Analysis)
  | ({
      source: "backend";
      id: string;
      cropId: CropId;
      mode: AnalysisMode;
      imageUrl: string;
      fileName: string;
      createdAt: string;
      backend: BackendAnalysisResponse;
    });

export interface Crop {
  id: CropId;
  name: string;
  localName: string;
  emoji: string;
  season: string;
  healthScore: number;
}

export interface Finding {
  id: string;
  kind: "disease" | "pest";
  name: string;
  scientificName: string;
  crops: CropId[];
  summary: string;
  symptoms: string[];
  immediateActions: string[];
  prevention: string[];
  organicOptions: string[];
  chemicalOptions: string[];
  favourableConditions: string[];
}

export interface EnvFactor {
  label: string;
  value: string;
  contribution: number; // 0-100
  note: string;
}

export interface Analysis {
  id: string;
  cropId: CropId;
  mode: AnalysisMode;
  findingId: string;
  confidence: number; // 0-100
  severity: Severity;
  riskLevel: RiskLevel;
  imageUrl: string;
  createdAt: string; // ISO
  affectedArea: number; // % of leaf
  envFactors: EnvFactor[];
  isSample: boolean;
}

export interface WeatherNow {
  temperatureC: number;
  humidity: number;
  rainfallMm: number;
  windKph: number;
  condition: string;
  location: string;
  updatedAt: string;
}

export interface RiskScores {
  disease: number;
  pest: number;
  environmental: number;
  overall: number;
}

export interface RiskForecastPoint {
  day: string;
  disease: number;
  pest: number;
  environmental: number;
}

export interface HealthTrendPoint {
  date: string;
  health: number;
  risk: number;
}

export interface Alert {
  id: string;
  cropId: CropId;
  title: string;
  detail: string;
  severity: Severity;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  cropId: CropId;
  title: string;
  priority: "urgent" | "this-week" | "preventive";
  why: string;
  steps: string[];
  organic: string[];
  chemical: string[];
}
