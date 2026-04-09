"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "extracting" | "pending_review" | "approved" | "exported";
}

const STATUS_CONFIG: Record<
  StatusBadgeProps["status"],
  { label: string; className: string }
> = {
  extracting: {
    label: "Extracting",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  pending_review: {
    label: "Pending Review",
    className:
      "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
  },
  approved: {
    label: "Approved",
    className:
      "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
  },
  exported: {
    label: "Exported",
    className: "bg-muted text-muted-foreground",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={cn(config.className)}
      aria-label={`Vehicle status: ${config.label}`}
    >
      {config.label}
    </Badge>
  );
}
