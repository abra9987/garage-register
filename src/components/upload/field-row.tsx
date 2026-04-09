import { cn } from "@/lib/utils";
import { ConfidenceBadge } from "./confidence-badge";
import type { ConfidenceLevel } from "@/types/extraction";

interface FieldRowProps {
  label: string;
  value: string | number | null | undefined;
  confidence: ConfidenceLevel;
  isMono?: boolean;
}

export function FieldRow({
  label,
  value,
  confidence,
  isMono = false,
}: FieldRowProps) {
  const displayValue =
    value !== null && value !== undefined ? String(value) : null;

  return (
    <div className="flex items-center gap-2">
      <span className="min-w-[120px] text-sm font-normal text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-normal",
          isMono && "font-mono tracking-wider",
          !displayValue && "italic text-muted-foreground",
        )}
      >
        {displayValue || "--"}
      </span>
      <ConfidenceBadge level={confidence} />
    </div>
  );
}
