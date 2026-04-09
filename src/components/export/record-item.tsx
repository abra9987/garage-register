"use client";

import { Checkbox } from "@/components/ui/checkbox";

interface RecordItemProps {
  id: string;
  jobNumber: string | null;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  selected: boolean;
  onToggle: () => void;
}

export function RecordItem({
  jobNumber,
  vin,
  year,
  make,
  model,
  selected,
  onToggle,
}: RecordItemProps) {
  const displayJob = jobNumber ?? "No Job #";
  const vehicleSummary = [year, make, model].filter(Boolean).join(" ") || "Unknown Vehicle";
  const displayVin = vin ?? "No VIN";

  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        aria-label={`Select ${displayJob} for export`}
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{displayJob}</p>
        <p className="text-sm text-muted-foreground">{vehicleSummary}</p>
        <p className="font-mono text-xs text-muted-foreground">VIN: {displayVin}</p>
      </div>
    </div>
  );
}
