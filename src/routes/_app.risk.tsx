import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Bug, CloudRain, Droplets, Leaf, Thermometer, Wind } from "lucide-react";
import { AppShell } from "@/components/cropcare/app-shell";
import { DemoBadge } from "@/components/cropcare/badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { crops } from "@/data/mock";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getRiskForecast, getRiskScores, getWeather } from "@/lib/services/cropcare";

export const Route = createFileRoute("/_app/risk")({
  head: () => ({
    meta: [
      { title: "Risk Monitor — CropCare AI" },
      {
        name: "description",
        content:
          "Temperature, humidity, rainfall and wind turned into disease, pest and environmental risk scores with a 7-day outlook.",
      },
      { property: "og:title", content: "Risk Monitor — CropCare AI" },
      {
        property: "og:description",
        content: "Weather-driven disease and pest risk for the week ahead.",
      },
    ],
  }),
  component: RiskPage,
});

function riskWord(value: number) {
  if (value >= 75) return { label: "Severe", tone: "text-danger", advice: "Inspect fields daily." };
  if (value >= 60) return { label: "High", tone: "text-danger", advice: "Inspect every two days." };
  if (value >= 40)
    return { label: "Moderate", tone: "text-warning", advice: "Weekly scouting is enough." };
  return { label: "Low", tone: "text-success", advice: "Keep to your normal routine." };
}

const cropRisk: Record<string, { disease: number; pest: number }> = {
  tomato: { disease: 78, pest: 61 },
  potato: { disease: 86, pest: 44 },
  maize: { disease: 41, pest: 72 },
  grape: { disease: 55, pest: 38 },
  apple: { disease: 62, pest: 29 },
};

function RiskPage() {
  const geo = useGeolocation();
  const weather = useQuery({
    queryKey: ["weather", geo.lat, geo.lng],
    queryFn: () => getWeather(geo.lat, geo.lng),
  });
  const scores = useQuery({ queryKey: ["risk"], queryFn: getRiskScores });
  const forecast = useQuery({ queryKey: ["forecast"], queryFn: getRiskForecast });

  const w = weather.data;
  const weatherCards = w
    ? [
        { icon: Thermometer, label: "Temperature", value: `${w.temperatureC}°C`, note: "Warm — favours fungal growth" },
        { icon: Droplets, label: "Humidity", value: `${w.humidity}%`, note: "Very high — leaves stay wet" },
        { icon: CloudRain, label: "Rainfall (24h)", value: `${w.rainfallMm} mm`, note: "Rain splash spreads spores" },
        { icon: Wind, label: "Wind", value: `${w.windKph} km/h`, note: "Light breeze — slow spread" },
      ]
    : [];

  return (
    <AppShell
      title="Risk monitor"
      subtitle={w?.location ?? "Weather-based disease and pest risk"}
    >
      <div className="space-y-5">
        <DemoBadge />

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {weatherCards.map(({ icon: Icon, label, value, note }) => (
            <Card key={label} className="card-lift">
              <CardContent className="p-4">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4.5" />
                </span>
                <p className="mt-3 font-display text-2xl font-bold">{value}</p>
                <p className="text-sm font-medium">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{note}</p>
              </CardContent>
            </Card>
          ))}
          {weather.isLoading &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {scores.data &&
            [
              { key: "disease", label: "Disease risk", value: scores.data.disease, Icon: Leaf },
              { key: "pest", label: "Pest risk", value: scores.data.pest, Icon: Bug },
              {
                key: "env",
                label: "Environmental risk",
                value: scores.data.environmental,
                Icon: CloudRain,
              },
            ].map(({ key, label, value, Icon }) => {
              const word = riskWord(value);
              return (
                <Card key={key}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="size-4 text-primary" /> {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className={`font-display text-4xl font-bold ${word.tone}`}>{value}</span>
                      <span className="text-sm text-muted-foreground">/ 100 · {word.label}</span>
                    </div>
                    <Progress value={value} className="mt-3 h-2" />
                    <p className="mt-2 text-sm text-muted-foreground">{word.advice}</p>
                  </CardContent>
                </Card>
              );
            })}
          {scores.isLoading &&
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>7-day risk outlook</CardTitle>
            <CardDescription>
              Thursday looks like the highest-risk day — plan any spraying before then
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecast.data ?? []} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
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
                  <Line
                    type="monotone"
                    dataKey="disease"
                    name="Disease"
                    stroke="var(--color-chart-3)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pest"
                    name="Pest"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="environmental"
                    name="Environmental"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk by crop</CardTitle>
            <CardDescription>Where to spend your time this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={crops.map((c) => ({
                    crop: c.name,
                    disease: cropRisk[c.id]?.disease ?? 0,
                    pest: cropRisk[c.id]?.pest ?? 0,
                  }))}
                  margin={{ left: -20, right: 8, top: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="crop" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="disease" name="Disease" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="pest" name="Pest" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Demo weather feed. In the full system these numbers come from a live weather API and
              your field location.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
