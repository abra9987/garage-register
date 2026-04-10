"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/review/status-badge";
import { DeleteVehicleDialog } from "@/components/shared/delete-vehicle-dialog";

type VehicleStatus = "extracting" | "pending_review" | "approved" | "exported";

export interface VehicleRow {
  id: string;
  jobNumber: string | null;
  status: VehicleStatus;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  purchaseDate: string | null;
  saleDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VehicleTableProps {
  vehicles: VehicleRow[];
  sort: string;
  dir: "asc" | "desc";
  onSort: (col: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onDelete: (id: string) => void;
}

const SORTABLE_COLUMNS = [
  { key: "jobNumber", label: "Job #", width: "w-[100px]" },
  { key: "vin", label: "VIN", width: "w-[180px]" },
  { key: "year", label: "Year", width: "w-[60px]" },
  { key: "make", label: "Make", width: "w-[100px]" },
  { key: "model", label: "Model", width: "w-[100px]" },
  { key: "status", label: "Status", width: "w-[120px]" },
  { key: "purchaseDate", label: "Acquired", width: "w-[100px]" },
  { key: "saleDate", label: "Disposed", width: "w-[100px]" },
] as const;

function getSortDirection(
  columnKey: string,
  currentSort: string,
  currentDir: "asc" | "desc"
): "ascending" | "descending" | "none" {
  if (columnKey !== currentSort) return "none";
  return currentDir === "asc" ? "ascending" : "descending";
}

export function VehicleTable({
  vehicles,
  sort,
  dir,
  onSort,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDelete,
}: VehicleTableProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<VehicleRow | null>(null);

  const approvedOnPage = vehicles.filter((v) => v.status === "approved");
  const allApprovedSelected =
    approvedOnPage.length > 0 &&
    approvedOnPage.every((v) => selectedIds.has(v.id));

  return (
    <div className="hidden md:block">
      <Table aria-label="Vehicle register">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[40px] text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 py-3 px-4">
              <Checkbox
                checked={allApprovedSelected}
                onCheckedChange={() => onToggleSelectAll()}
                aria-label="Select all records"
              />
            </TableHead>
            {SORTABLE_COLUMNS.map((col) => {
              const sortDir = getSortDirection(col.key, sort, dir);
              return (
                <TableHead
                  key={col.key}
                  className={`${col.width} text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 py-3 px-4 cursor-pointer select-none`}
                  aria-sort={sortDir}
                  onClick={() => onSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sort === col.key && (
                      dir === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    )}
                  </span>
                </TableHead>
              );
            })}
            <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 py-3 px-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((v) => (
            <TableRow
              key={v.id}
              className="hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/vehicles/${v.id}/review`)}
            >
              <TableCell
                className="py-3 px-4 border-b border-border"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={selectedIds.has(v.id)}
                  onCheckedChange={() => onToggleSelect(v.id)}
                  disabled={v.status !== "approved"}
                  aria-label={`Select ${v.jobNumber || "vehicle"} for export`}
                />
              </TableCell>
              <TableCell className="py-3 px-4 border-b border-border text-sm font-semibold">
                {v.jobNumber || "--"}
              </TableCell>
              <TableCell className="py-3 px-4 border-b border-border text-sm font-mono tracking-wider truncate max-w-[180px]">
                {v.vin || "--"}
              </TableCell>
              <TableCell className="py-3 px-4 border-b border-border text-sm">
                {v.year || "--"}
              </TableCell>
              <TableCell className="py-3 px-4 border-b border-border text-sm">
                {v.make || "--"}
              </TableCell>
              <TableCell className="py-3 px-4 border-b border-border text-sm">
                {v.model || "--"}
              </TableCell>
              <TableCell
                className="py-3 px-4 border-b border-border"
                onClick={(e) => e.stopPropagation()}
              >
                <StatusBadge status={v.status} />
              </TableCell>
              <TableCell className="py-3 px-4 border-b border-border text-sm">
                {v.purchaseDate || "--"}
              </TableCell>
              <TableCell className="py-3 px-4 border-b border-border text-sm">
                {v.saleDate || "--"}
              </TableCell>
              <TableCell
                className="py-3 px-4 border-b border-border"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(v)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${v.jobNumber || "vehicle"}`}
                >
                  <Trash2 className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/vehicles/${v.id}/review`)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <DeleteVehicleDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        vehicleId={deleteTarget?.id ?? ""}
        jobNumber={deleteTarget?.jobNumber ?? null}
        make={deleteTarget?.make ?? null}
        model={deleteTarget?.model ?? null}
        year={deleteTarget?.year ?? null}
        status={deleteTarget?.status ?? "pending_review"}
        onDeleted={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
