import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Camera,
  CloudSun,
  Leaf,
  LineChart,
  ListChecks,
  ScanLine,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BrandMark } from "@/components/cropcare/app-shell";
import { DemoBadge } from "@/components/cropcare/badges";
import { crops } from "@/data/mock";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CropCare AI — Early Crop Disease & Pest Detection" },
      {
        name: "description",
        content:
          "Photograph a leaf, get an early read on crop disease or pest risk, weather-based alerts and clear management steps for tomato, potato, maize, grape and apple.",
      },
      { property: "og:title", content: "CropCare AI — Early Crop Disease & Pest Detection" },
      {
        property: "og:description",
        content:
          "Farmer-friendly crop health monitoring: leaf image analysis, weather-driven risk scores and practical management advice.",
      },
    ],
  }),
  component: Landing,
});

const steps = [
  {
    icon: Sprout,
    title: "1. Choose your crop",
    text: "Tomato, potato, maize, grape or apple — pick what is standing in your field today.",
  },
  {
    icon: Camera,
    title: "2. Upload a leaf photo",
    text: "One clear photo of the affected leaf from your phone is enough to start.",
  },
  {
    icon: ListChecks,
    title: "3. Get an action plan",
    text: "See the likely disease or pest, how serious it looks, and what to do first.",
  },
];

const features = [
  {
    icon: ScanLine,
    title: "Leaf image analysis",
    text: "Disease-only, pest-only or automatic mode, with an attention-map view to show what the model looked at.",
  },
  {
    icon: CloudSun,
    title: "Weather-linked risk",
    text: "Temperature, humidity, rainfall and wind combined into disease, pest and environmental risk scores.",
  },
  {
    icon: LineChart,
    title: "Health trends",
    text: "Track how your crop health score and field risk move week by week.",
  },
  {
    icon: ShieldCheck,
    title: "Practical advice",
    text: "Immediate steps, prevention, and both organic and chemical options in plain language.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild>
              <Link to="/analyze">
                Analyze a crop <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="bg-field-gradient">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="rise-in">
            <DemoBadge />
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              Catch crop disease and pests{" "}
              <span className="text-primary">before they spread</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              CropCare AI helps farmers spot trouble early. Take a photo of a leaf, check the
              weather-based risk for your area, and follow simple steps written for the field — not
              for a laboratory.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/analyze">
                  <ScanLine className="size-4" /> Start an analysis
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/dashboard">See the dashboard</Link>
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              This is a demonstration build for the Smart India Hackathon. Predictions shown are
              sample data and must not be used as a real diagnosis.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {steps.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="card-lift border-border/70 bg-card/90">
                <CardContent className="p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
                </CardContent>
              </Card>
            ))}
            <Card className="card-lift border-primary/30 bg-primary text-primary-foreground">
              <CardContent className="p-5">
                <Leaf className="size-6" />
                <h3 className="mt-4 text-base font-semibold">Built for Indian fields</h3>
                <p className="mt-1.5 text-sm opacity-90">
                  Crop names, seasons and treatment options that match how farmers actually work.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">Crops supported today</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
          Five staple crops, with a shared model pipeline that can be extended to more.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {crops.map((crop) => (
            <Card key={crop.id} className="card-lift text-center">
              <CardContent className="p-5">
                <div className="text-3xl">{crop.emoji}</div>
                <h3 className="mt-3 font-semibold">{crop.name}</h3>
                <p className="text-xs text-muted-foreground">{crop.localName}</p>
                <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {crop.season}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold sm:text-3xl">What you get</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="card-lift">
                <CardContent className="flex gap-4 p-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/25 text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-semibold sm:text-3xl">Ready to check your field?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Walk through the full demo flow: choose a crop, upload a leaf photo, and see the analysis,
          risk monitor and recommendations.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link to="/analyze">
            Analyze a crop now <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-xs text-muted-foreground sm:px-6">
          <BrandMark />
          <p>
            CropCare AI — demonstration prototype for early detection and management of crop
            diseases and pest infestations. No real model accuracy is claimed.
          </p>
        </div>
      </footer>
    </div>
  );
}
