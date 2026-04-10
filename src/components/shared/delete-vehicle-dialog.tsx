"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  jobNumber: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  status: "extracting" | "pending_review" | "approved" | "exported";
  onDeleted: () => void;
}

export function DeleteVehicleDialog({
  open,
  onOpenChange,
  vehicleId,
  jobNumber,
  make,
  model,
  year,
  status,
  onDeleted,
}: DeleteVehicleDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const vehicleLabel =
    [jobNumber && `Job #${jobNumber}`, year, make, model]
      .filter(Boolean)
      .join(" \u2014 ") || "this vehicle";

  const isExported = status === "exported";

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(
          json.error || "Failed to delete vehicle. Please try again."
        );
        return;
      }
      toast.success(`Vehicle deleted: ${vehicleLabel}`);
      onOpenChange(false);
      onDeleted();
    } catch {
      toast.error("Failed to delete vehicle. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Vehicle Record</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <strong className="text-foreground">{vehicleLabel}</strong>? This
            will permanently remove the vehicle record and all associated
            documents. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {isExported && (
          <p className="text-sm text-destructive font-medium">
            Warning: This vehicle has already been exported to the Garage
            Register. Deleting it will not remove it from previously exported
            XLSX files.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
