import { cn } from "@/lib/utils";
import type { RiskLevel, Severity } from "@/types";
import { AlertTriangle, Info, ShieldAlert, ShieldCheck } from "lucide-react";

const severityMap: Record<Severity, { label: string; className: string; Icon: typeof Info }> = {
  low: { label: "Low — keep watching", className: "bg-success-soft text-success", Icon: ShieldCheck },
  moderate: { label: "Moderate — plan this week", className: "bg-warning-soft text-warning", Icon: Info },
  high: { label: "High — act today", className: "bg-danger-soft text-danger", Icon: AlertTriangle },
  critical: { label: "Critical — act now", className: "bg-danger text-danger-foreground", Icon: ShieldAlert },
  unknown: { label: "Unknown — uncertain", className: "bg-muted-soft text-muted-foreground", Icon: Info },
};

const riskMap: Record<RiskLevel, { label: string; className: string }> = {
  low: { label: "Low risk", className: "bg-success-soft text-success" },
  moderate: { label: "Moderate risk", className: "bg-warning-soft text-warning" },
  high: { label: "High risk", className: "bg-danger-soft text-danger" },
  severe: { label: "Severe risk", className: "bg-danger text-danger-foreground" },
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const { label, className: tone, Icon } = severityMap[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

export function RiskBadge({ risk, className }: { risk: RiskLevel; className?: string }) {
  const { label, className: tone } = riskMap[risk];
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", tone, className)}
    >
      {label}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-warning",
        className,
      )}
    >
      <Info className="size-3.5" />
      Demo data
    </span>
  );
}
