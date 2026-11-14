import { AlertTriangle, CheckCircle2, Users } from "lucide-react";
import type { CrowdLevel } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLE: Record<CrowdLevel, string> = {
  Low: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  Moderate: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200",
  High: "border-red-300 bg-red-100 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-200",
};
const ICON = { Low: CheckCircle2, Moderate: Users, High: AlertTriangle } as const;

/** Colour is never the only signal: every level also has an icon and a text label. */
export function CrowdBadge({ level }: { level: CrowdLevel }) {
  const Icon = ICON[level];
  return (
    <Badge variant="outline" className={cn("gap-1", STYLE[level])}>
      <Icon className="h-3 w-3" aria-hidden /> Crowd: {level}
    </Badge>
  );
}
