"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for debugging (server-side in production)
    console.error("[error-boundary]", error);
  }, [error]);

  // D-05: Friendly message, no stack traces, no technical error codes
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md">
          We encountered an unexpected issue. Please try again, and if the
          problem persists, contact support.
        </p>
      </div>
      <Button onClick={reset} variant="default">
        Try again
      </Button>
    </div>
  );
}
