"use client";

import { useEffect, useRef } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ReviewField } from "@/components/review/review-field";
import { VinStatus } from "@/components/upload/vin-status";
import { ConflictCard } from "@/components/upload/conflict-card";
import { validateVin } from "@/lib/validation/vin";
import {
  vehicleSaveSchema,
  VEHICLE_FORM_FIELDS,
  type VehicleSaveInput,
} from "@/lib/validation/vehicle-schema";
import type { ConfidenceLevel } from "@/types/extraction";
import type { FieldConflict } from "@/lib/extraction/cross-validate";

interface VehicleData {
  jobNumber?: string | null;
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  odometer?: number | null;
  sellerName?: string | null;
  sellerAddress?: string | null;
  buyerName?: string | null;
  buyerAddress?: string | null;
  purchasePrice?: string | number | null;
  salePrice?: string | number | null;
  purchaseDate?: string | null;
  saleDate?: string | null;
  stockNumber?: string | null;
  extractionConfidence?: Record<string, unknown> | null;
}

interface ReviewFormProps {
  vehicle: VehicleData;
  confidence: Record<string, ConfidenceLevel>;
  conflicts: FieldConflict[];
  hasBothDocuments: boolean;
  onSave: (data: VehicleSaveInput) => Promise<void>;
  isSaving: boolean;
  formRef?: React.MutableRefObject<UseFormReturn | null>;
}

export function ReviewForm({
  vehicle,
  confidence,
  conflicts,
  hasBothDocuments,
  onSave,
  isSaving,
  formRef,
}: ReviewFormProps) {
  // CRITICAL: Do NOT pass generic type parameter (Zod v4 + RHF pitfall)
  const form = useForm({
    resolver: zodResolver(vehicleSaveSchema),
    defaultValues: {
      jobNumber: vehicle.jobNumber ?? "",
      vin: vehicle.vin ?? "",
      year: vehicle.year ?? "",
      make: vehicle.make ?? "",
      model: vehicle.model ?? "",
      color: vehicle.color ?? "",
      odometer: vehicle.odometer ?? "",
      sellerName: vehicle.sellerName ?? "",
      sellerAddress: vehicle.sellerAddress ?? "",
      buyerName: vehicle.buyerName ?? "",
      buyerAddress: vehicle.buyerAddress ?? "",
      purchasePrice: vehicle.purchasePrice ?? "",
      salePrice: vehicle.salePrice ?? "",
      purchaseDate: vehicle.purchaseDate ?? "",
      saleDate: vehicle.saleDate ?? "",
      stockNumber: vehicle.stockNumber ?? "",
    },
  });

  // Store original values for diff display
  const originalValues = useRef<Record<string, string>>({});
  useEffect(() => {
    const vals: Record<string, string> = {};
    for (const field of VEHICLE_FORM_FIELDS) {
      const v = vehicle[field.name as keyof VehicleData];
      vals[field.name] = v != null ? String(v) : "";
    }
    originalValues.current = vals;
  }, []); // Only on mount

  // Expose form to parent via ref
  useEffect(() => {
    if (formRef) {
      formRef.current = form as unknown as UseFormReturn;
    }
  }, [form, formRef]);

  // Watch VIN for reactive validation
  const vinValue = form.watch("vin");
  const vinResult = validateVin(
    typeof vinValue === "string" && vinValue.length > 0 ? vinValue : null,
  );

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSave(data as VehicleSaveInput);
    form.reset(data);
  });

  let prevSection: string | null = null;

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {VEHICLE_FORM_FIELDS.map((field) => {
            const showSectionHeader = field.section !== prevSection;
            prevSection = field.section;

            const fieldConfidence: ConfidenceLevel =
              confidence[field.name] ?? "not_found";
            const isDirty = !!form.formState.dirtyFields[field.name];
            const fieldError = form.formState.errors[field.name];
            const errorMessage = fieldError?.message
              ? String(fieldError.message)
              : undefined;

            return (
              <div key={field.name}>
                {showSectionHeader && (
                  <>
                    {field.section === "transaction" && (
                      <Separator className="my-4" />
                    )}
                    <h3 className="text-base font-semibold mb-3">
                      {field.section === "vehicle"
                        ? "Vehicle Details"
                        : "Transaction Details"}
                    </h3>
                  </>
                )}
                <ReviewField
                  label={field.label}
                  fieldName={field.name}
                  confidence={fieldConfidence}
                  isEdited={isDirty}
                  originalValue={originalValues.current[field.name]}
                  error={errorMessage}
                  required={field.required}
                  inputType={field.type}
                  register={form.register(field.name)}
                />
                {/* VIN validation status after VIN field */}
                {field.name === "vin" && (
                  <div className="mt-1">
                    <VinStatus vinResult={vinResult} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Cross-document conflicts */}
          <div className="mt-4">
            <ConflictCard
              conflicts={conflicts}
              hasBothDocuments={hasBothDocuments}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
