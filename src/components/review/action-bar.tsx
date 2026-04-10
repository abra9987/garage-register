"use client";

import { Button } from "@/components/ui/button";
import { Save, Loader2, CheckCircle2, Undo2, Trash2 } from "lucide-react";

interface ActionBarProps {
  vehicleStatus: "extracting" | "pending_review" | "approved" | "exported";
  isFormDirty: boolean;
  canApprove: boolean;
  onSave: () => void;
  onApprove: () => void;
  onUnapprove: () => void;
  onDeleteClick: () => void;
  isSaving: boolean;
  isApproving: boolean;
  isUnapproving: boolean;
  isDeleting: boolean;
}

export function ActionBar({
  vehicleStatus,
  isFormDirty,
  canApprove,
  onSave,
  onApprove,
  onUnapprove,
  onDeleteClick,
  isSaving,
  isApproving,
  isUnapproving,
  isDeleting,
}: ActionBarProps) {
  return (
    <div className="flex flex-col gap-3 sticky bottom-0 bg-card p-4 border-t lg:static lg:border-0 lg:p-0 lg:mt-4">
      {/* Save Changes Button */}
      {isFormDirty && (
        <Button
          variant="default"
          size="lg"
          className="h-12 w-full"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="size-5" />
              Save Changes
            </>
          )}
        </Button>
      )}

      {/* Approve Record Button */}
      {vehicleStatus === "pending_review" && (
        <Button
          variant="default"
          size="lg"
          className="h-12 w-full hover:bg-green-600 hover:text-white dark:hover:bg-green-600"
          onClick={onApprove}
          disabled={!canApprove || isApproving}
          title={
            !canApprove
              ? "Fill required fields to approve (VIN, Year, Make, Model, and Seller or Buyer Name)"
              : undefined
          }
        >
          {isApproving ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Approving...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-5" />
              Approve Record
            </>
          )}
        </Button>
      )}

      {/* Unapprove Button */}
      {vehicleStatus === "approved" && (
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-full"
          onClick={onUnapprove}
          disabled={isUnapproving}
        >
          {isUnapproving ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Returning to Review...
            </>
          ) : (
            <>
              <Undo2 className="size-5" />
              Return to Review
            </>
          )}
        </Button>
      )}

      {/* Spacer to separate destructive action */}
      <div className="flex-1" />

      {/* Delete Record Button */}
      <Button
        variant="ghost"
        size="lg"
        className="h-12 w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={onDeleteClick}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Deleting...
          </>
        ) : (
          <>
            <Trash2 className="size-5" />
            Delete Record
          </>
        )}
      </Button>
    </div>
  );
}
