"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FieldRow } from "./field-row";
import { VinStatus } from "./vin-status";
import { ConflictCard } from "./conflict-card";
import { validateVin, type VinValidationResult } from "@/lib/validation/vin";
import type { ConfidenceLevel } from "@/types/extraction";
import type { FieldConflict } from "@/lib/extraction/cross-validate";

/** Vehicle data shape from the status API response */
export interface VehicleData {
  id: string;
  status: string;
  jobNumber: string | null;
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
  purchasePrice: string | null;
  salePrice: string | null;
  purchaseDate: string | null;
  saleDate: string | null;
  stockNumber: string | null;
  extractionConfidence: Record<string, unknown> | null;
}

/** Document metadata shape from the status API response */
export interface DocumentData {
  id: string;
  type: "ap" | "ar";
  filename: string;
  fileSize: number;
  uploadedAt: string;
  extractionRaw: unknown;
}

interface ExtractionResultsProps {
  vehicle: VehicleData;
  documents: DocumentData[];
  conflicts: FieldConflict[] | null;
}

function getConfidence(
  confidenceMap: Record<string, unknown> | null,
  field: string,
): ConfidenceLevel {
  if (!confidenceMap) return "not_found";
  const level = confidenceMap[field];
  if (
    level === "high" ||
    level === "medium" ||
    level === "low" ||
    level === "not_found"
  ) {
    return level as ConfidenceLevel;
  }
  return "not_found";
}

export function ExtractionResults({
  vehicle,
  documents,
  conflicts,
}: ExtractionResultsProps) {
  const conf = vehicle.extractionConfidence;
  const hasBothDocuments =
    documents.some((d) => d.type === "ap") &&
    documents.some((d) => d.type === "ar");

  // Run VIN validation on the client for display
  const vinResult: VinValidationResult | null = vehicle.vin
    ? validateVin(vehicle.vin)
    : validateVin(null);

  return (
    <Card>
      <CardContent className="space-y-6">
        <h2 className="text-base font-semibold">Extracted Data</h2>

        {/* Vehicle Details */}
        <div className="grid gap-3 md:grid-cols-2">
          <FieldRow
            label="VIN"
            value={vehicle.vin}
            confidence={getConfidence(conf, "vin")}
            isMono
          />
          <FieldRow
            label="Year"
            value={vehicle.year}
            confidence={getConfidence(conf, "year")}
          />
          <FieldRow
            label="Make"
            value={vehicle.make}
            confidence={getConfidence(conf, "make")}
          />
          <FieldRow
            label="Model"
            value={vehicle.model}
            confidence={getConfidence(conf, "model")}
          />
          <FieldRow
            label="Color"
            value={vehicle.color}
            confidence={getConfidence(conf, "color")}
          />
          <FieldRow
            label="Odometer"
            value={vehicle.odometer ? `${vehicle.odometer.toLocaleString()} km` : null}
            confidence={getConfidence(conf, "odometer")}
          />
        </div>

        <Separator />

        {/* Transaction Details */}
        <div className="grid gap-3 md:grid-cols-2">
          <FieldRow
            label="Seller"
            value={vehicle.sellerName}
            confidence={getConfidence(conf, "sellerName")}
          />
          <FieldRow
            label="Buyer"
            value={vehicle.buyerName}
            confidence={getConfidence(conf, "buyerName")}
          />
          <FieldRow
            label="Purchase Price"
            value={
              vehicle.purchasePrice
                ? `$${Number(vehicle.purchasePrice).toLocaleString("en-CA", { minimumFractionDigits: 2 })}`
                : null
            }
            confidence={getConfidence(conf, "purchasePrice")}
          />
          <FieldRow
            label="Sale Price"
            value={
              vehicle.salePrice
                ? `$${Number(vehicle.salePrice).toLocaleString("en-CA", { minimumFractionDigits: 2 })}`
                : null
            }
            confidence={getConfidence(conf, "salePrice")}
          />
          <FieldRow
            label="Date Acquired"
            value={vehicle.purchaseDate}
            confidence={getConfidence(conf, "purchaseDate")}
          />
          <FieldRow
            label="Date Disposed"
            value={vehicle.saleDate}
            confidence={getConfidence(conf, "saleDate")}
          />
        </div>

        {/* VIN Validation */}
        <VinStatus vinResult={vinResult} />

        {/* Cross-Document Conflicts */}
        <ConflictCard
          conflicts={conflicts || []}
          hasBothDocuments={hasBothDocuments}
        />

        {/* Continue to Review */}
        <Button variant="secondary" disabled title="Coming in Phase 3">
          Continue to Review
        </Button>
      </CardContent>
    </Card>
  );
}
