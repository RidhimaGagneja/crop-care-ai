import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowRight, ScanLine, Search } from "lucide-react";
import { AppShell } from "@/components/cropcare/app-shell";
import { SeverityBadge } from "@/components/cropcare/badges";
import { CropIcon } from "@/components/cropcare/crop-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { crops, cropById } from "@/data/mock";
import { getBackendHistory } from "@/lib/services/cropcare";
import { useAuth } from "@/lib/auth-context";
import { API_SEVERITY_TO_SEVERITY, type Severity } from "@/types";

/**
 * The database sends timestamps like "2026-09-14T08:52:00" with no "Z" or
 * offset — technically ambiguous, so JavaScript's Date parser wrongly
 * treats it as local time instead of UTC. This fixes that before parsing,
 * so times always display correctly in the viewer's own timezone.
 */
function parseUtcTimestamp(value: string): Date {
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

export const Route = createFileRoute("/_app/history")({
  head: () => ({
    meta: [
      { title: "Analysis History — CropCare AI" },
      {
        name: "description",
        content:
          "Every leaf analysis you have run, with crop, predicted disease or pest, confidence, severity and date.",
      },
      { property: "og:title", content: "Analysis History — CropCare AI" },
      {
        property: "og:description",
        content: "Look back at past crop checks and compare how your field is changing.",
      },
    ],
  }),
  component: HistoryPage,
});

const severities: (Severity | "all")[] = ["all", "low", "moderate", "high", "critical"];

function HistoryPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["backend-history", user?.userId],
    queryFn: () => getBackendHistory(user!.token),
    enabled: !!user,
  });
  const [crop, setCrop] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return (data ?? []).filter((a) => {
      const mappedSeverity = API_SEVERITY_TO_SEVERITY[a.backend.severity.toLowerCase()] ?? "unknown";
      const matchesCrop = crop === "all" || a.cropId === crop;
      const matchesSeverity = severity === "all" || mappedSeverity === severity;
      const text = `${a.backend.condition} ${cropById(a.cropId)?.name ?? ""}`.toLowerCase();
      return matchesCrop && matchesSeverity && text.includes(query.trim().toLowerCase());
    });
  }, [data, crop, severity, query]);

  return (
    <AppShell
      title="Analysis history"
      subtitle="Every crop check saved to your account"
      actions={
        <Button asChild size="sm">
          <Link to="/analyze">
            <ScanLine className="size-4" /> <span className="hidden sm:inline">New analysis</span>
          </Link>
        </Button>
      }
    >
      <div className="space-y-5">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by crop or disease name"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[{ id: "all", name: "All crops" }, ...crops].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCrop(c.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    crop === c.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {c.id !== "all" && <CropIcon cropId={c.id as never} size="xs" />}
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {severities.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                    severity === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {s === "all" ? "All severity" : s}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {isLoading && <Skeleton className="h-64" />}

        {!isLoading && rows.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center">
              <p className="font-medium">
                {data && data.length === 0 ? "No analyses yet." : "No analyses match these filters."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {data && data.length === 0
                  ? "Run your first crop check to see it appear here."
                  : "Try clearing the search or picking another crop."}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3">
          {rows.map((a) => {
            const cropInfo = cropById(a.cropId);
            const mappedSeverity = API_SEVERITY_TO_SEVERITY[a.backend.severity.toLowerCase()] ?? "unknown";
            return (
              <Link
                key={a.id}
                to="/result/$id"
                params={{ id: a.id }}
                className="card-lift flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"
              >
                <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <CropIcon cropId={a.cropId} size="md" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{a.backend.condition}</p>
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      Real AI
                    </span>
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                    <CropIcon cropId={a.cropId} size="xs" />
                    <span>{cropInfo?.name}</span>
                    <span>·</span>
                    <span>{Math.round(a.backend.confidence * 100)}% confidence</span>
                    <span>·</span>
                    <span>{a.mode === "pest" ? "Pest" : "Disease"} mode</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {parseUtcTimestamp(a.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={mappedSeverity} />
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
