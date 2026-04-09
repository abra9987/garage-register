import { cn } from "@/lib/utils";
import type { ConfidenceLevel } from "@/types/extraction";

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
}

const BADGE_CONFIG: Record<
  ConfidenceLevel,
  { label: string; className: string }
> = {
  high: {
    label: "High",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  medium: {
    label: "Medium",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  low: {
    label: "Low",
    className:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  not_found: {
    label: "Not Found",
    className: "bg-muted text-muted-foreground",
  },
};

export function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  const config = BADGE_CONFIG[level];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-normal",
        config.className,
      )}
      aria-label={`Confidence: ${level}`}
    >
      {config.label}
    </span>
  );
}
