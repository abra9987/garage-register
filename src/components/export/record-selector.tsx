"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { RecordItem } from "@/components/export/record-item";

interface VehicleRow {
  id: string;
  jobNumber: string | null;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
}

interface RecordSelectorProps {
  records: VehicleRow[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}

export function RecordSelector({
  records,
  selectedIds,
  onToggle,
  onToggleAll,
}: RecordSelectorProps) {
  const allSelected = records.length > 0 && selectedIds.size === records.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < records.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Select Records to Export
        </CardTitle>
        <CardDescription>
          {records.length} approved records available
        </CardDescription>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              No approved records available. Review and approve vehicles first.
            </p>
            <Button
              variant="outline"
              render={<Link href="/register?status=pending_review" />}
            >
              Go to Register
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={onToggleAll}
                aria-label="Select all records"
              />
              <span className="text-sm font-medium">Select All</span>
            </div>
            {records.map((record) => (
              <RecordItem
                key={record.id}
                id={record.id}
                jobNumber={record.jobNumber}
                vin={record.vin}
                year={record.year}
                make={record.make}
                model={record.model}
                selected={selectedIds.has(record.id)}
                onToggle={() => onToggle(record.id)}
              />
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
