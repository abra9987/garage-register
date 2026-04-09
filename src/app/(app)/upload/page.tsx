"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DropZone } from "@/components/upload/drop-zone";
import {
  ExtractionStatus,
  type ExtractionStatusValue,
} from "@/components/upload/extraction-status";
import {
  ExtractionResults,
  type VehicleData,
  type DocumentData,
} from "@/components/upload/extraction-results";
import type { FieldConflict } from "@/lib/extraction/cross-validate";

export default function UploadPage() {
  const [apFile, setApFile] = useState<File | null>(null);
  const [arFile, setArFile] = useState<File | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [jobNumber, setJobNumber] = useState("");
  const [status, setStatus] = useState<ExtractionStatusValue>("idle");
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);
  const [documentsData, setDocumentsData] = useState<DocumentData[]>([]);
  const [conflicts, setConflicts] = useState<FieldConflict[] | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Determine extraction readiness
  const hasFiles = apFile !== null || arFile !== null;

  useEffect(() => {
    if (hasFiles && status === "idle") {
      setStatus("ready");
    } else if (!hasFiles && status === "ready") {
      setStatus("idle");
    }
  }, [hasFiles, status]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleApDrop = useCallback((file: File) => {
    setApFile(file);
    toast.success("AP Invoice uploaded", { duration: 3000 });
  }, []);

  const handleArDrop = useCallback((file: File) => {
    setArFile(file);
    toast.success("AR Invoice uploaded", { duration: 3000 });
  }, []);

  const handleApRemove = useCallback(() => {
    setApFile(null);
  }, []);

  const handleArRemove = useCallback(() => {
    setArFile(null);
  }, []);

  const pollStatus = useCallback(
    (vid: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current);

      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/vehicles/${vid}/status`);
          if (!res.ok) return;

          const json = await res.json();
          if (!json.success) return;

          const vehicle = json.data.vehicle as VehicleData;
          const docs = json.data.documents as DocumentData[];

          // Check for extraction errors in documents
          const hasError = docs.some(
            (d) =>
              d.extractionRaw &&
              typeof d.extractionRaw === "object" &&
              "error" in (d.extractionRaw as Record<string, unknown>),
          );

          // Check if extraction error is stored in vehicle confidence
          const vehicleHasError =
            vehicle.extractionConfidence &&
            typeof vehicle.extractionConfidence === "object" &&
            "error" in vehicle.extractionConfidence;

          if (vehicle.status === "pending_review") {
            // Extraction complete
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;

            setVehicleData(vehicle);
            setDocumentsData(docs);

            // Extract conflicts from vehicle.extractionConfidence
            const conf = vehicle.extractionConfidence as Record<
              string,
              unknown
            > | null;
            if (conf && Array.isArray(conf.conflicts)) {
              setConflicts(conf.conflicts as FieldConflict[]);
            } else {
              setConflicts(null);
            }

            // Auto-fill job number if extracted and input is empty
            if (vehicle.jobNumber && !jobNumber) {
              setJobNumber(vehicle.jobNumber);
            }

            setStatus("complete");
            toast.success("Extraction complete -- review data below", {
              duration: 4000,
            });
          } else if (hasError || vehicleHasError) {
            // Extraction failed
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setStatus("failed");
            toast.error("Extraction failed. Please try again.", {
              duration: Infinity,
            });
          }
        } catch {
          // Network error during polling -- silently retry on next interval
        }
      }, 2000);
    },
    [jobNumber],
  );

  const handleExtract = useCallback(async () => {
    if (!apFile && !arFile) return;

    setStatus("extracting");
    toast.info("Extracting data from documents...", { duration: 3000 });

    try {
      // Step 1: Create vehicle record
      const createRes = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobNumber: jobNumber || null }),
      });

      if (!createRes.ok) {
        throw new Error("Failed to create vehicle record");
      }

      const createJson = await createRes.json();
      if (!createJson.success) {
        throw new Error(createJson.error || "Failed to create vehicle");
      }

      const vid = createJson.data.id as string;
      setVehicleId(vid);

      // Step 2: Upload AP file if present
      if (apFile) {
        const formData = new FormData();
        formData.append("file", apFile);
        formData.append("type", "ap");

        const uploadRes = await fetch(`/api/vehicles/${vid}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload AP invoice");
        }
      }

      // Step 3: Upload AR file if present
      if (arFile) {
        const formData = new FormData();
        formData.append("file", arFile);
        formData.append("type", "ar");

        const uploadRes = await fetch(`/api/vehicles/${vid}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload AR invoice");
        }
      }

      // Step 4: Start polling for status
      pollStatus(vid);
    } catch (error) {
      setStatus("failed");
      toast.error(
        error instanceof Error
          ? error.message
          : "Upload failed. Please check your connection and try again.",
        { duration: Infinity },
      );
    }
  }, [apFile, arFile, jobNumber, pollStatus]);

  const handleRetry = useCallback(() => {
    if (vehicleId) {
      setStatus("extracting");
      toast.info("Retrying extraction...", { duration: 3000 });
      pollStatus(vehicleId);
    } else {
      handleExtract();
    }
  }, [vehicleId, pollStatus, handleExtract]);

  const isExtracting = status === "extracting";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold">New Vehicle</h1>
        <p className="text-muted-foreground">
          Upload AP and AR invoices to extract vehicle data for the Garage
          Register.
        </p>
      </div>

      {/* Job Number */}
      <Card>
        <CardContent>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="jobNumber">Job Number</Label>
            <Input
              id="jobNumber"
              placeholder="26-J00000"
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              disabled={isExtracting}
            />
            <p className="text-xs text-muted-foreground">
              Auto-filled from PDF if detected
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Drop Zones */}
      <div className="flex flex-col gap-4 md:flex-row">
        <DropZone
          label="AP Invoice (Purchase)"
          ariaLabel="Upload AP Invoice PDF"
          file={apFile}
          onDrop={handleApDrop}
          onRemove={handleApRemove}
          disabled={isExtracting}
        />
        <DropZone
          label="AR Invoice (Sale)"
          ariaLabel="Upload AR Invoice PDF"
          file={arFile}
          onDrop={handleArDrop}
          onRemove={handleArRemove}
          disabled={isExtracting}
        />
      </div>

      {/* Extraction Status / Action */}
      <ExtractionStatus
        status={status}
        onExtract={handleExtract}
        onRetry={handleRetry}
      />

      {/* Loading Skeletons during extraction */}
      {isExtracting && (
        <Card>
          <CardContent className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
            <Skeleton className="my-2 h-px w-full" />
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={`tx-${i}`} className="h-6 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extraction Results */}
      {vehicleData && status !== "extracting" && (
        <ExtractionResults
          vehicle={vehicleData}
          documents={documentsData}
          conflicts={conflicts}
        />
      )}
    </div>
  );
}
