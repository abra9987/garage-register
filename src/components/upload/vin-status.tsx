import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { VinValidationResult } from "@/lib/validation/vin";

interface VinStatusProps {
  vinResult: VinValidationResult | null;
}

export function VinStatus({ vinResult }: VinStatusProps) {
  if (!vinResult) return null;

  // VIN not found in document
  if (!vinResult.formatValid && vinResult.error === "VIN is empty") {
    return (
      <div role="status" className="flex items-center gap-2">
        <span className="text-sm italic text-muted-foreground">
          VIN not found in document
        </span>
      </div>
    );
  }

  // VIN valid -- format and check digit verified
  if (vinResult.valid) {
    return (
      <div role="status" className="flex items-center gap-2">
        <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
        <span className="text-sm text-green-600 dark:text-green-400">
          VIN valid -- format and check digit verified
        </span>
      </div>
    );
  }

  // VIN check digit invalid
  if (vinResult.formatValid && !vinResult.checkDigitValid) {
    return (
      <div role="status" className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm text-amber-600 dark:text-amber-400">
          VIN check digit invalid -- expected {vinResult.expectedCheckDigit},
          got {vinResult.actualCheckDigit}. Verify during review.
        </span>
      </div>
    );
  }

  // VIN format invalid
  return (
    <div role="status" className="flex items-center gap-2">
      <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
      <span className="text-sm text-red-600 dark:text-red-400">
        {vinResult.error || "VIN format invalid"}. Verify during review.
      </span>
    </div>
  );
}
