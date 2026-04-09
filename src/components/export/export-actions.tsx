"use client";

import { Download, FilePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportActionsProps {
  selectedCount: number;
  isExporting: boolean;
  onExport: () => void;
  mode: "new" | "append";
  disabled: boolean;
}

export function ExportActions({
  selectedCount,
  isExporting,
  onExport,
  mode,
  disabled,
}: ExportActionsProps) {
  const isDisabled = disabled || selectedCount === 0;

  const buttonLabel =
    mode === "new" ? "Export New XLSX" : "Append to Register";
  const ButtonIcon = mode === "new" ? Download : FilePlus;
  const ariaLabel = `Export ${selectedCount} selected records to ${mode === "new" ? "new XLSX" : "existing register"}`;

  return (
    <div className="flex items-center justify-between pt-4">
      <span className="text-sm font-semibold">
        {selectedCount} selected
      </span>
      <Button
        variant="default"
        size="lg"
        disabled={isDisabled}
        onClick={onExport}
        aria-label={ariaLabel}
        className={isDisabled ? "opacity-50" : ""}
        title={isDisabled && selectedCount === 0 ? "Select at least one record to export" : undefined}
      >
        {isExporting ? (
          <>
            <Loader2 className="animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <ButtonIcon />
            {buttonLabel}
          </>
        )}
      </Button>
    </div>
  );
}
