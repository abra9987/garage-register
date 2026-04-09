"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ExportSuccessProps {
  visible: boolean;
  onDismiss: () => void;
}

export function ExportSuccess({ visible, onDismiss }: ExportSuccessProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <Card
      className="mb-4 bg-green-50 dark:bg-green-950/20"
      role="status"
    >
      <CardContent className="flex items-center gap-3">
        <CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
        <p className="text-sm font-semibold text-green-700 dark:text-green-300">
          Export complete! Your file is downloading.
        </p>
      </CardContent>
    </Card>
  );
}
