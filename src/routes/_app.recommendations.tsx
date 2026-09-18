import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CalendarClock, ShieldCheck, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/cropcare/app-shell";
import { DemoBadge } from "@/components/cropcare/badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { crops, cropById } from "@/data/mock";
import { getRecommendations } from "@/lib/services/cropcare";
import type { Recommendation } from "@/types";

export const Route = createFileRoute("/_app/recommendations")({
  head: () => ({
    meta: [
      { title: "Recommendations — CropCare AI" },
      {
        name: "description",
        content:
          "Prioritised crop management actions: what to do today, what to plan this week, and preventive steps for each crop.",
      },
      { property: "og:title", content: "Recommendations — CropCare AI" },
      {
        property: "og:description",
        content: "Clear, prioritised management steps with organic and chemical options.",
      },
    ],
  }),
  component: RecommendationsPage,
});

const groups = [
  {
    id: "urgent" as const,
    title: "Do today",
    description: "These cannot wait — losses grow quickly from here",
    icon: AlertTriangle,
    tone: "text-danger",
    ring: "border-danger/30",
  },
  {
    id: "this-week" as const,
    title: "Plan this week",
    description: "Important, but you have a few days",
    icon: CalendarClock,
    tone: "text-warning",
    ring: "border-warning/30",
  },
  {
    id: "preventive" as const,
    title: "Keep doing",
    description: "Habits that stop the next outbreak",
    icon: ShieldCheck,
    tone: "text-success",
    ring: "border-success/30",
  },
];

function RecommendationCard({ rec, ring }: { rec: Recommendation; ring: string }) {
  const crop = cropById(rec.cropId);
  return (
    <Card className={cn("card-lift", ring)}>
      <CardHeader>
        <CardDescription>
          {crop?.emoji} {crop?.name} · {crop?.localName}
        </CardDescription>
        <CardTitle className="text-base">{rec.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="rounded-lg bg-muted/50 p-3 text-muted-foreground">
          <span className="font-medium text-foreground">Why: </span>
          {rec.why}
        </p>
        <div>
          <p className="font-medium">Steps</p>
          <ol className="mt-2 space-y-2 text-muted-foreground">
            {rec.steps.map((s, i) => (
              <li key={s} className="flex gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-success">Organic</p>
            <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
              {rec.organic.map((o) => (
                <li key={o}>• {o}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">Chemical</p>
            <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
              {rec.chemical.map((o) => (
                <li key={o}>• {o}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["recs"], queryFn: getRecommendations });
  const [crop, setCrop] = useState("all");

  const filtered = (data ?? []).filter((r) => crop === "all" || r.cropId === crop);

  return (
    <AppShell
      title="Recommendations"
      subtitle="What to do first, in plain language"
    >
      <div className="space-y-6">
        <DemoBadge />

        <div className="flex flex-wrap gap-2">
          {[{ id: "all", name: "All crops", emoji: "🌍" }, ...crops].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCrop(c.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                crop === c.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>

        {isLoading && <Skeleton className="h-64" />}

        {groups.map(({ id, title, description, icon: Icon, tone, ring }) => {
          const items = filtered.filter((r) => r.priority === id);
          if (!items.length) return null;
          return (
            <section key={id}>
              <div className="mb-3 flex items-center gap-2">
                <Icon className={cn("size-5", tone)} />
                <div>
                  <h2 className="font-display text-lg font-semibold">{title}</h2>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {items.map((rec) => (
                  <RecommendationCard key={rec.id} rec={rec} ring={ring} />
                ))}
              </div>
            </section>
          );
        })}

        <Card className="border-warning/40 bg-warning-soft/40">
          <CardContent className="flex gap-3 p-5 text-sm text-muted-foreground">
            <TriangleAlert className="size-5 shrink-0 text-warning" />
            <p>
              Safety first: always read the product label, wear gloves and a mask while spraying,
              respect the waiting period before harvest, and confirm with your local Krishi Vigyan
              Kendra before using any chemical. These demo recommendations are illustrative only.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
