"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Upload,
  CheckCircle2,
  Pencil,
  Download,
  type LucideIcon,
} from "lucide-react";

interface ActivityItemProps {
  action: string;
  fieldName: string | null;
  jobNumber: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  timestamp: string;
}

function getIcon(
  action: string,
  fieldName: string | null
): { Icon: LucideIcon; colorClass: string } {
  if (action === "created") {
    return { Icon: Upload, colorClass: "text-blue-600 dark:text-blue-400" };
  }
  if (action === "exported") {
    return { Icon: Download, colorClass: "text-primary" };
  }
  if (action === "updated" && !fieldName) {
    return {
      Icon: CheckCircle2,
      colorClass: "text-green-600 dark:text-green-400",
    };
  }
  // updated with fieldName = field edit
  return { Icon: Pencil, colorClass: "text-amber-600 dark:text-amber-400" };
}

function getDescription(
  action: string,
  fieldName: string | null,
  jobNumber: string | null,
  year: number | null,
  make: string | null,
  model: string | null
): string {
  const identifier =
    jobNumber ||
    [year, make, model].filter(Boolean).join(" ") ||
    "vehicle";

  switch (action) {
    case "created":
      return `Uploaded documents for ${identifier}`;
    case "exported":
      return `Exported ${identifier} to register`;
    case "updated":
      if (fieldName) {
        return `Edited ${fieldName} on ${identifier}`;
      }
      return `Approved ${identifier} for export`;
    default:
      return `${action} ${identifier}`;
  }
}

export function ActivityItem({
  action,
  fieldName,
  jobNumber,
  year,
  make,
  model,
  timestamp,
}: ActivityItemProps) {
  const { Icon, colorClass } = getIcon(action, fieldName);
  const description = getDescription(
    action,
    fieldName,
    jobNumber,
    year,
    make,
    model
  );
  const timeAgo = formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
  });

  return (
    <li
      className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
      aria-label={`${description} ${timeAgo}`}
    >
      <Icon className={`size-4 shrink-0 ${colorClass}`} />
      <span className="flex-1 text-sm font-normal truncate">{description}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo}</span>
    </li>
  );
}
