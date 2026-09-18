import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bug,
  ImagePlus,
  Loader2,
  RefreshCw,
  ScanLine,
  Sparkles,
  Stethoscope,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AppShell } from "@/components/cropcare/app-shell";
import { DemoBadge } from "@/components/cropcare/badges";
import { CropIcon } from "@/components/cropcare/crop-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { crops } from "@/data/mock";
import { analyzeImageWithBackend, type BackendApiError } from "@/lib/services/cropcare";
import { useAuth } from "@/lib/auth-context";
import type { AnalysisMode, CropId } from "@/types";

export const Route = createFileRoute("/_app/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze Crop — CropCare AI" },
      {
        name: "description",
        content:
          "Select your crop, upload a leaf photo and run a demo disease or pest analysis with confidence and severity output.",
      },
      { property: "og:title", content: "Analyze Crop — CropCare AI" },
      {
        property: "og:description",
        content: "Upload a leaf photo and get a demo disease or pest reading in seconds.",
      },
    ],
  }),
  component: AnalyzePage,
});

const modes: { id: AnalysisMode; label: string; text: string; icon: typeof Bug }[] = [
  { id: "disease", label: "Disease", text: "Check for fungal and bacterial leaf diseases", icon: Stethoscope },
  { id: "pest", label: "Pest", text: "Check for insect damage and infestation", icon: Bug },
  { id: "auto", label: "Automatic", text: "Let the model decide what to look for", icon: Sparkles },
];

const stages = ["Preparing the image", "Uploading to CropCare backend", "Running the model", "Writing your advice"];

function AnalyzePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [cropId, setCropId] = useState<CropId>("tomato");
  const [mode, setMode] = useState<AnalysisMode>("auto");
  const [file, setFile] = useState<{ url: string; name: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<BackendApiError | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (file) URL.revokeObjectURL(file.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accept = useCallback((f: File | undefined) => {
    if (!f || !f.type.startsWith("image/")) return;
    fileInputRef.current = f;
    setError(null);
    setFile((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { url: URL.createObjectURL(f), name: f.name };
    });
  }, []);

  const progressRatio = useMemo(() => ((stage + 1) / stages.length) * 100, [stage]);

  async function run(retry = false) {
    if (!file || !fileInputRef.current) {
      setError({
        field: "image",
        statusCode: 400,
        error: "Missing image",
        message: retry ? "Upload a clear leaf photo, then try again." : "Upload a leaf photo before running the analysis.",
      });
      return;
    }
    if (!user) return;
    setLoading(true);
    setError(null);
    setStage(0);
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, stages.length - 1)), 550);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await analyzeImageWithBackend({
        cropId,
        mode,
        imageUrl: file.url,
        fileName: file.name,
        file: fileInputRef.current,
        token: user.token,
        signal: controller.signal,
      });
      navigate({ to: "/result/$id", params: { id: result.id } });
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError" || (err as BackendApiError)?.error === "Request cancelled") {
        setError({
          statusCode: 0,
          error: "Request cancelled",
          message: "Analysis was cancelled.",
        });
      } else if ((err as BackendApiError)?.message) {
        setError(err as BackendApiError);
      } else {
        setError({
          statusCode: 500,
          error: "Unexpected error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    } finally {
      clearInterval(timer);
      setLoading(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  const isFieldError = (field: string) => error?.field === field;

  return (
    <AppShell title="Analyze your crop" subtitle="Three quick steps — crop, photo, analyze">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>1. Which crop is this?</CardTitle>
              <CardDescription>Pick the crop standing in your field</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {crops.map((crop) => (
                  <button
                    key={crop.id}
                    type="button"
                    onClick={() => {
                      setCropId(crop.id);
                      setError(null);
                    }}
                    className={cn(
                      "rounded-xl border p-3 text-center transition-all",
                      cropId === crop.id
                        ? "border-primary bg-primary/8 shadow-sm ring-2 ring-primary/25"
                        : "border-border hover:border-primary/40 hover:bg-muted/50",
                    )}
                  >
                    <div className="flex justify-center">
                      <CropIcon cropId={crop.id} size="lg" />
                    </div>
                    <p className="mt-1.5 text-sm font-medium">{crop.name}</p>
                    <p className="text-[11px] text-muted-foreground">{crop.localName}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. What should we look for?</CardTitle>
              <CardDescription>Automatic works well if you are unsure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {modes.map(({ id, label, text, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setMode(id);
                      setError(null);
                    }}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all",
                      mode === id
                        ? "border-primary bg-primary/8 shadow-sm ring-2 ring-primary/25"
                        : "border-border hover:border-primary/40 hover:bg-muted/50",
                    )}
                  >
                    <Icon className={cn("size-5", mode === id ? "text-primary" : "text-muted-foreground")} />
                    <p className="mt-2 font-medium">{label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Upload a leaf photo</CardTitle>
              <CardDescription>
                One clear, close photo in daylight gives the best reading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => accept(e.target.files?.[0])}
              />
              {file ? (
                <div
                  className={cn(
                    "overflow-hidden rounded-xl border",
                    isFieldError("image") ? "border-danger/70 ring-2 ring-danger/20" : "border-border",
                  )}
                >
                  <img src={file.url} alt="Selected leaf preview" className="h-64 w-full object-cover" />
                  <div className="flex items-center justify-between gap-2 bg-muted/40 p-3">
                    <p className="truncate text-sm text-muted-foreground">{file.name}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                        <ImagePlus className="size-4" /> Replace
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          URL.revokeObjectURL(file.url);
                          fileInputRef.current = null;
                          setFile(null);
                          setError(null);
                        }}
                      >
                        <Trash2 className="size-4" /> Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    accept(e.dataTransfer.files?.[0]);
                  }}
                  className={cn(
                    "flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                    dragging ? "border-primary bg-primary/8" : "border-border hover:bg-muted/40",
                    isFieldError("image") ? "border-danger/70 ring-2 ring-danger/20" : null,
                  )}
                >
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Upload className="size-6" />
                  </span>
                  <p className="mt-4 font-medium">Drag a photo here, or tap to choose</p>
                  <p className="mt-1 text-sm text-muted-foreground">JPG, PNG or WebP — up to 10 MB</p>
                </div>
              )}

              {error ? (
                <Alert variant="destructive" className="mt-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" />
                    <div className="min-w-0 flex-1">
                      <AlertTitle className="flex items-center gap-2">
                        Analysis failed
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-7 px-2 text-muted-foreground hover:text-foreground"
                          onClick={() => setError(null)}
                          aria-label="Dismiss error"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </AlertTitle>
                      <AlertDescription>
                        <p className="text-sm text-muted-foreground">{error.message}</p>
                        {error.field ? (
                          <p className="mt-1 text-xs text-muted-foreground/80">
                            Field: <span className="font-mono">{error.field}</span>
                            {error.statusCode ? <> · Status {error.statusCode}</> : null}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setError(null);
                              void run(true);
                            }}
                            disabled={loading}
                          >
                            <RefreshCw className="size-4" /> Retry analysis
                          </Button>
                          {error.field === "image" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => inputRef.current?.click()}
                            >
                              <ImagePlus className="size-4" /> Pick a different image
                            </Button>
                          ) : null}
                          {loading && abortRef.current ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => abortRef.current?.abort()}
                            >
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ) : null}

              <Button className="mt-5 w-full" size="lg" disabled={!file || loading} onClick={() => void run(false)}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Analyzing…
                  </>
                ) : (
                  <>
                    <ScanLine className="size-4" /> Analyze crop
                  </>
                )}
              </Button>

              {loading && (
                <div className="mt-4 rounded-xl bg-muted/50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{stages[stage]}…</p>
                    {abortRef.current ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => abortRef.current?.abort()}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                  <Progress value={progressRatio} className="mt-2 h-1.5" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-warning/30 bg-warning-soft/40">
            <CardContent className="p-5">
              <DemoBadge />
              <p className="mt-3 text-sm text-muted-foreground">
                This build runs on sample data. The result you get is a demonstration of the
                interface and the advice format — it is not a real diagnosis and no model accuracy
                is claimed.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips for a good photo</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {[
                  "Hold the leaf flat and fill most of the frame",
                  "Shoot in daylight, avoid your own shadow",
                  "Include both healthy and affected parts of the leaf",
                  "Take a second photo of the underside if you see insects",
                  "Avoid blurry or very dark photos",
                ].map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
