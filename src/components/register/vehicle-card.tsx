"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/review/status-badge";
import type { VehicleRow } from "./vehicle-table";

interface VehicleCardProps {
  vehicle: VehicleRow;
  selected: boolean;
  onToggle: () => void;
}

export function VehicleCard({ vehicle: v, selected, onToggle }: VehicleCardProps) {
  return (
    <Card className="md:hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            disabled={v.status !== "approved"}
            aria-label={`Select ${v.jobNumber || "vehicle"} for export`}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">
                  {v.jobNumber || "No job #"}
                </span>
                <StatusBadge status={v.status} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={`/vehicles/${v.id}/review`} />}
              >
                View
              </Button>
            </div>
            <p className="text-sm font-mono tracking-wider text-muted-foreground truncate mt-1">
              {v.vin || "No VIN"}
            </p>
            <p className="text-sm text-muted-foreground">
              {[v.year, v.make, v.model].filter(Boolean).join(" ") ||
                "Vehicle details pending"}
            </p>
            <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
              <span>Acquired: {v.purchaseDate || "--"}</span>
              <span>Disposed: {v.saleDate || "--"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
