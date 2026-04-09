"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ExtractionStatusValue =
  | "idle"
  | "ready"
  | "extracting"
  | "complete"
  | "failed";

interface ExtractionStatusProps {
  status: ExtractionStatusValue;
  onExtract: () => void;
  onRetry: () => void;
}

export function ExtractionStatus({
  status,
  onExtract,
  onRetry,
}: ExtractionStatusProps) {
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    if (status === "complete") {
      setShowComplete(true);
      const timer = setTimeout(() => setShowComplete(false), 2000);
      return () => clearTimeout(timer);
    }
    setShowComplete(false);
  }, [status]);

  if (status === "idle") {
    return (
      <div>
        <Button
          size="lg"
          disabled
          className="opacity-50"
          title="Upload at least one PDF to begin"
        >
          Start Extraction
        </Button>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div>
        <Button size="lg" onClick={onExtract}>
          Start Extraction
        </Button>
      </div>
    );
  }

  if (status === "extracting") {
    return (
      <div className="flex items-center gap-2" aria-live="polite">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          Extracting data from documents...
        </span>
      </div>
    );
  }

  if (status === "complete" && showComplete) {
    return (
      <div className="flex items-center gap-2" aria-live="polite">
        <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
        <span className="text-sm text-green-600 dark:text-green-400">
          Extraction complete
        </span>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-destructive" />
          <span className="text-sm text-destructive">
            Extraction failed. The document could not be processed. Please try
            again or upload a different file.
          </span>
        </div>
        <Button variant="destructive" onClick={onRetry}>
          Retry Extraction
        </Button>
      </div>
    );
  }

  return null;
}
