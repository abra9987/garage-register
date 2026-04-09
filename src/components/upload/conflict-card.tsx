import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { FieldConflict } from "@/lib/extraction/cross-validate";

interface ConflictCardProps {
  conflicts: FieldConflict[];
  hasBothDocuments: boolean;
}

export function ConflictCard({
  conflicts,
  hasBothDocuments,
}: ConflictCardProps) {
  if (!hasBothDocuments) return null;

  // Both documents exist, no conflicts
  if (conflicts.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
        <span className="text-sm text-green-600 dark:text-green-400">
          Documents are consistent
        </span>
      </div>
    );
  }

  // Conflicts found
  return (
    <Card
      role="alert"
      className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20"
    >
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Conflicts Found
          </span>
        </div>
        <div className="space-y-2">
          {conflicts.map((conflict) => (
            <div key={conflict.fieldKey} className="text-sm">
              <span className="font-normal text-amber-800 dark:text-amber-200">
                {conflict.field}
              </span>
              <div className="ml-4 font-mono text-sm">
                <div>AP: {conflict.apValue ?? "--"}</div>
                <div>AR: {conflict.arValue ?? "--"}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs italic text-muted-foreground">
          Resolve during review
        </p>
      </CardContent>
    </Card>
  );
}
