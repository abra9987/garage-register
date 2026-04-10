"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/review/status-badge";
import { DeleteVehicleDialog } from "@/components/shared/delete-vehicle-dialog";
import type { VehicleRow } from "./vehicle-table";

interface VehicleCardProps {
  vehicle: VehicleRow;
  selected: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

export function VehicleCard({ vehicle: v, selected, onToggle, onDelete }: VehicleCardProps) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <>
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
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDelete(true)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${v.jobNumber || "vehicle"}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    render={<Link href={`/vehicles/${v.id}/review`} />}
                  >
                    View
                  </Button>
                </div>
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
      <DeleteVehicleDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        vehicleId={v.id}
        jobNumber={v.jobNumber}
        make={v.make}
        model={v.model}
        year={v.year}
        status={v.status}
        onDeleted={() => {
          setShowDelete(false);
          onDelete();
        }}
      />
    </>
  );
}
