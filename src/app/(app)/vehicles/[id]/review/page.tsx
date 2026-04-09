"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/review/status-badge";
import { ReviewForm } from "@/components/review/review-form";
import { ActionBar } from "@/components/review/action-bar";
import type { ConfidenceLevel } from "@/types/extraction";
import type { FieldConflict } from "@/lib/extraction/cross-validate";
import type { VehicleSaveInput } from "@/lib/validation/vehicle-schema";

const PdfPreview = dynamic(() => import("@/components/review/pdf-preview"), {
  ssr: false,
  loading: () => <Skeleton className="h-[600px] w-full" />,
});

interface VehicleRecord {
  id: string;
  jobNumber: string | null;
  status: "extracting" | "pending_review" | "approved" | "exported";
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
  odometer: number | null;
  sellerName: string | null;
  sellerAddress: string | null;
  buyerName: string | null;
  buyerAddress: string | null;
  purchaseDate: string | null;
  saleDate: string | null;
  purchasePrice: string | null;
  salePrice: string | null;
  stockNumber: string | null;
  extractionConfidence: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentRecord {
  id: string;
  type: "ap" | "ar";
  filename: string;
}

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [vehicle, setVehicle] = useState<VehicleRecord | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isUnapproving, setIsUnapproving] = useState(false);
  const [isReExtracting, setIsReExtracting] = useState(false);

  const [isFormDirty, setIsFormDirty] = useState(false);
  const [canApprove, setCanApprove] = useState(false);

  const formRef = useRef<UseFormReturn | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch vehicle data
  const fetchVehicle = useCallback(async () => {
    try {
      const res = await fetch(`/api/vehicles/${id}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to load vehicle data");
        return null;
      }
      setVehicle(json.data.vehicle);
      setDocuments(
        json.data.documents.map((d: DocumentRecord) => ({
          id: d.id,
          type: d.type,
          filename: d.filename,
        })),
      );
      setError(null);
      return json.data.vehicle;
    } catch {
      setError("Failed to load vehicle data. Please refresh the page or return to the Register.");
      return null;
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    fetchVehicle().finally(() => setLoading(false));
  }, [fetchVehicle]);

  // Poll form state for dirty/canApprove
  useEffect(() => {
    const interval = setInterval(() => {
      const f = formRef.current;
      if (!f) return;
      setIsFormDirty(f.formState.isDirty);

      const vals = f.getValues();
      const vinVal = typeof vals.vin === "string" ? vals.vin.trim() : "";
      const yearVal = vals.year != null && vals.year !== "" && vals.year !== 0;
      const makeVal = typeof vals.make === "string" ? vals.make.trim() : "";
      const modelVal = typeof vals.model === "string" ? vals.model.trim() : "";
      const sellerVal =
        typeof vals.sellerName === "string" ? vals.sellerName.trim() : "";
      const buyerVal =
        typeof vals.buyerName === "string" ? vals.buyerName.trim() : "";

      setCanApprove(
        vinVal.length === 17 &&
          yearVal &&
          makeVal.length > 0 &&
          modelVal.length > 0 &&
          (sellerVal.length > 0 || buyerVal.length > 0),
      );
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Extract confidence map from vehicle.extractionConfidence
  const confidence: Record<string, ConfidenceLevel> = {};
  if (vehicle?.extractionConfidence) {
    const ec = vehicle.extractionConfidence;
    for (const [key, value] of Object.entries(ec)) {
      if (
        key !== "conflicts" &&
        key !== "vinValidation" &&
        key !== "error" &&
        typeof value === "string" &&
        ["high", "medium", "low", "not_found"].includes(value)
      ) {
        confidence[key] = value as ConfidenceLevel;
      }
    }
  }

  // Extract conflicts from extractionConfidence
  const conflicts: FieldConflict[] = [];
  const hasBothDocuments = documents.some((d) => d.type === "ap") && documents.some((d) => d.type === "ar");
  if (vehicle?.extractionConfidence) {
    const ec = vehicle.extractionConfidence;
    if (Array.isArray(ec.conflicts)) {
      for (const c of ec.conflicts) {
        if (c && typeof c === "object" && "field" in c && "fieldKey" in c) {
          conflicts.push(c as FieldConflict);
        }
      }
    }
  }

  // Handlers
  const handleSave = useCallback(
    async (data: VehicleSaveInput) => {
      setIsSaving(true);
      try {
        const res = await fetch(`/api/vehicles/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          toast.error(json.error || "Failed to save changes. Please try again.");
          return;
        }
        toast.success("Changes saved");
        await fetchVehicle();
      } catch {
        toast.error("Failed to save changes. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [id, fetchVehicle],
  );

  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    try {
      // Save first if form is dirty
      if (formRef.current?.formState.isDirty) {
        const data = formRef.current.getValues();
        await handleSave(data as VehicleSaveInput);
      }

      const res = await fetch(`/api/vehicles/${id}/approve`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to approve record. Please try again.");
        return;
      }
      toast.success("Record approved -- ready for export");
      await fetchVehicle();
    } catch {
      toast.error("Failed to approve record. Please try again.");
    } finally {
      setIsApproving(false);
    }
  }, [id, fetchVehicle, handleSave]);

  const handleUnapprove = useCallback(async () => {
    setIsUnapproving(true);
    try {
      const res = await fetch(`/api/vehicles/${id}/approve`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to return record to review.");
        return;
      }
      toast("Record returned to review");
      await fetchVehicle();
    } catch {
      toast.error("Failed to return record to review.");
    } finally {
      setIsUnapproving(false);
    }
  }, [id, fetchVehicle]);

  const handleReExtract = useCallback(
    (docId: string, docType: "ap" | "ar") => {
      toast.info(
        "Re-extraction will update AI-extracted values. Your manual edits are preserved.",
      );
      setIsReExtracting(true);

      fetch(`/api/vehicles/${id}/documents/${docId}/reextract`, {
        method: "POST",
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error("Re-extraction request failed");
          }

          // Poll for completion
          const startTime = Date.now();
          pollRef.current = setInterval(async () => {
            try {
              const pollRes = await fetch(`/api/vehicles/${id}`);
              const pollJson = await pollRes.json();
              if (
                pollRes.ok &&
                pollJson.success &&
                pollJson.data.vehicle.status !== "extracting"
              ) {
                if (pollRef.current) clearInterval(pollRef.current);
                pollRef.current = null;
                setIsReExtracting(false);
                setVehicle(pollJson.data.vehicle);
                toast.success("Document re-extracted -- review updated fields");
              }

              // Timeout after 60 seconds
              if (Date.now() - startTime > 60000) {
                if (pollRef.current) clearInterval(pollRef.current);
                pollRef.current = null;
                setIsReExtracting(false);
                toast.error("Re-extraction timed out. Please try again.");
                await fetchVehicle();
              }
            } catch {
              // Ignore poll errors
            }
          }, 2000);
        })
        .catch(() => {
          setIsReExtracting(false);
          toast.error("Re-extraction failed. Please try again.");
        });
    },
    [id, fetchVehicle],
  );

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-2/5">
            <Skeleton className="h-[600px] w-full" />
          </div>
          <div className="w-full lg:w-3/5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !vehicle) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load vehicle data. Please refresh the page or return to
            the Register.
          </AlertDescription>
        </Alert>
        <Button variant="outline" render={<Link href="/register" />}>
          Go to Register
        </Button>
      </div>
    );
  }

  // Not found
  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h2 className="text-xl font-semibold">No Vehicle Found</h2>
        <Button variant="outline" render={<Link href="/register" />}>
          Go to Register
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Review Vehicle</h1>
          <p className="text-sm text-muted-foreground">
            {vehicle.jobNumber
              ? `Job #${vehicle.jobNumber}`
              : "No job number assigned"}
          </p>
        </div>
        <StatusBadge status={vehicle.status} />
      </div>

      {/* Split Layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* PDF Preview - 40% on desktop */}
        <div className="w-full lg:w-2/5">
          <PdfPreview
            vehicleId={id}
            documents={documents}
            onReExtract={handleReExtract}
            isReExtracting={isReExtracting}
          />
        </div>

        {/* Form - 60% on desktop */}
        <div className="w-full lg:w-3/5">
          <ReviewForm
            key={vehicle.updatedAt}
            vehicle={vehicle}
            confidence={confidence}
            conflicts={conflicts}
            hasBothDocuments={hasBothDocuments}
            onSave={handleSave}
            isSaving={isSaving}
            formRef={formRef}
          />
          <ActionBar
            vehicleStatus={vehicle.status}
            isFormDirty={isFormDirty}
            canApprove={canApprove}
            onSave={() =>
              formRef.current?.handleSubmit(
                (data: Record<string, unknown>) => handleSave(data as VehicleSaveInput),
              )()
            }
            onApprove={handleApprove}
            onUnapprove={handleUnapprove}
            isSaving={isSaving}
            isApproving={isApproving}
            isUnapproving={isUnapproving}
          />
        </div>
      </div>
    </div>
  );
}
