import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Bell,
  CloudRain,
  Droplets,
  ScanLine,
  Thermometer,
  Wind,
} from "lucide-react";
import { AppShell } from "@/components/cropcare/app-shell";
import { DemoBadge, SeverityBadge } from "@/components/cropcare/badges";
import { CropIcon } from "@/components/cropcare/crop-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cropById } from "@/data/mock";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getFinding } from "@/lib/services/cropcare";
import {
  getAlerts,
  getCrops,
  getHealthTrend,
  getHistory,
  getRecommendations,
  getRiskScores,
  getWeather,
} from "@/lib/services/cropcare";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CropCare AI" },
      {
        name: "description",
        content:
          "Crop health scores, disease and pest alerts, weather, overall risk and recent leaf analyses in one farmer-friendly view.",
      },
      { property: "og:title", content: "Dashboard — CropCare AI" },
      {
        property: "og:description",
        content: "Track crop health, alerts, weather and field risk at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function healthTone(score: number) {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-warning";
  return "text-danger";
}

function Dashboard() {
  const geo = useGeolocation();
  const crops = useQuery({ queryKey: ["crops"], queryFn: getCrops });
  const weather = useQuery({
    queryKey: ["weather", geo.lat, geo.lng],
    queryFn: () => getWeather(geo.lat, geo.lng),
  });
  const risk = useQuery({ queryKey: ["risk"], queryFn: getRiskScores });
  const trend = useQuery({ queryKey: ["trend"], queryFn: getHealthTrend });
  const alerts = useQuery({ queryKey: ["alerts"], queryFn: getAlerts });
  const history = useQuery({ queryKey: ["history"], queryFn: getHistory });
  const recs = useQuery({ queryKey: ["recs"], queryFn: getRecommendations });

  const weatherItems = weather.data
    ? [
        { icon: Thermometer, label: "Temperature", value: `${weather.data.temperatureC}°C` },
        { icon: Droplets, label: "Humidity", value: `${weather.data.humidity}%` },
        { icon: CloudRain, label: "Rain (24h)", value: `${weather.data.rainfallMm} mm` },
        { icon: Wind, label: "Wind", value: `${weather.data.windKph} km/h` },
      ]
    : [];

  return (
    <AppShell
      title="Field dashboard"
      subtitle={weather.data?.location ?? "Loading your field summary"}
      actions={
        <Button asChild size="sm">
          <Link to="/analyze">
            <ScanLine className="size-4" /> <span className="hidden sm:inline">New analysis</span>
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <DemoBadge />

        {/* Crop health */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Crop health score
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(crops.data ?? []).map((crop) => (
              <Card key={crop.id} className="card-lift">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <CropIcon cropId={crop.id} size="md" />
                    <span className={`font-display text-xl font-bold ${healthTone(crop.healthScore)}`}>
                      {crop.healthScore}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{crop.name}</p>
                  <p className="text-xs text-muted-foreground">{crop.localName}</p>
                  <Progress value={crop.healthScore} className="mt-3 h-1.5" />
                </CardContent>
              </Card>
            ))}
            {crops.isLoading &&
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Risk score */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Overall field risk</CardTitle>
              <CardDescription>Weather and recent analyses combined</CardDescription>
            </CardHeader>
            <CardContent>
              {risk.data ? (
                <>
                  <div className="flex items-end gap-2">
                    <span className="font-display text-5xl font-bold text-danger">
                      {risk.data.overall}
                    </span>
                    <span className="pb-2 text-sm text-muted-foreground">/ 100</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    High risk week — inspect fields every two days.
                  </p>
                  <div className="mt-4 space-y-3">
                    {[
                      { label: "Disease risk", value: risk.data.disease },
                      { label: "Pest risk", value: risk.data.pest },
                      { label: "Environmental risk", value: risk.data.environmental },
                    ].map((r) => (
                      <div key={r.label}>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{r.label}</span>
                          <span className="font-semibold">{r.value}%</span>
                        </div>
                        <Progress value={r.value} className="mt-1 h-1.5" />
                      </div>
                    ))}
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-5 w-full">
                    <Link to="/risk">
                      Open risk monitor <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <Skeleton className="h-56" />
              )}
            </CardContent>
          </Card>

          {/* Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Crop health trend</CardTitle>
              <CardDescription>Average health score vs field risk, last 7 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend.data ?? []} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="gHealth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gRisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-card)",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="health"
                      name="Health score"
                      stroke="var(--color-chart-1)"
                      fill="url(#gHealth)"
                      strokeWidth={2.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="risk"
                      name="Risk score"
                      stroke="var(--color-chart-3)"
                      fill="url(#gRisk)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Alerts */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-4 text-danger" /> Disease &amp; pest alerts
              </CardTitle>
              <CardDescription>What needs your attention right now</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(alerts.data ?? []).map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium flex items-center gap-2">
                      <CropIcon cropId={alert.cropId} size="sm" />
                      <span>{alert.title}</span>
                    </p>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.detail}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{alert.createdAt}</p>
                </div>
              ))}
              {alerts.isLoading && <Skeleton className="h-40" />}
            </CardContent>
          </Card>

          {/* Weather */}
          <Card>
            <CardHeader>
              <CardTitle>Today's weather</CardTitle>
              <CardDescription>{weather.data?.condition ?? "Loading"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {weatherItems.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-xl bg-muted/40 p-3">
                    <Icon className="size-4 text-primary" />
                    <p className="mt-2 font-display text-lg font-semibold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Updated {weather.data?.updatedAt ?? "—"} ·{" "}
                {weather.data?.source === "live"
                  ? "live weather"
                  : weather.data?.source === "cached"
                    ? "recent cached reading"
                    : "demo weather feed"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent analyses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent analyses</CardTitle>
              <CardDescription>Your last leaf checks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(history.data ?? []).slice(0, 4).map((a) => (
                <Link
                  key={a.id}
                  to="/result/$id"
                  params={{ id: a.id }}
                  className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <img
                    src={a.imageUrl}
                    alt={`${cropById(a.cropId)?.name} leaf sample`}
                    className="size-12 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {getFinding(a.findingId)?.name ?? "Result"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cropById(a.cropId)?.name} · {a.confidence}% confidence
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to="/history">View all history</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recommended actions */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended actions</CardTitle>
              <CardDescription>Start with the urgent ones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(recs.data ?? []).slice(0, 4).map((r) => (
                <div key={r.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{r.title}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        r.priority === "urgent"
                          ? "bg-danger-soft text-danger"
                          : r.priority === "this-week"
                            ? "bg-warning-soft text-warning"
                            : "bg-success-soft text-success"
                      }`}
                    >
                      {r.priority === "this-week" ? "This week" : r.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.why}</p>
                </div>
              ))}
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to="/recommendations">See all recommendations</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
