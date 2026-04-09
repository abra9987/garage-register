import { z } from "zod";
import type { ExtractionField } from "@/types/extraction";

// ---- Save schema (PUT /api/vehicles/[id]) ----
// All fields nullable/optional since user may save partial edits during review.
// z.coerce.number() handles HTML inputs returning strings (Pitfall 6).

export const vehicleSaveSchema = z.object({
  jobNumber: z.string().max(20).nullable().optional(),
  vin: z.string().max(17).nullable().optional(),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 2).nullable().optional(),
  make: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  odometer: z.coerce.number().min(0).nullable().optional(),
  sellerName: z.string().max(255).nullable().optional(),
  sellerAddress: z.string().nullable().optional(),
  buyerName: z.string().max(255).nullable().optional(),
  buyerAddress: z.string().nullable().optional(),
  purchaseDate: z.string().nullable().optional(),
  saleDate: z.string().nullable().optional(),
  purchasePrice: z.coerce.number().min(0).nullable().optional(),
  salePrice: z.coerce.number().min(0).nullable().optional(),
  stockNumber: z.string().max(50).nullable().optional(),
});

export type VehicleSaveInput = z.infer<typeof vehicleSaveSchema>;

// ---- Approval schema (POST /api/vehicles/[id]/approve) ----
// Stricter: VIN, Year, Make, Model required. At least one of sellerName/buyerName required.

export const vehicleApprovalSchema = z
  .object({
    vin: z.string().length(17, "VIN must be exactly 17 characters"),
    year: z.coerce
      .number()
      .min(1900, "Year must be 1900 or later")
      .max(new Date().getFullYear() + 2, "Year too far in the future"),
    make: z.string().min(1, "Make is required"),
    model: z.string().min(1, "Model is required"),
    sellerName: z.string().nullable().optional(),
    buyerName: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      (data.sellerName && data.sellerName.trim().length > 0) ||
      (data.buyerName && data.buyerName.trim().length > 0),
    {
      message: "At least one of Seller Name or Buyer Name is required",
      path: ["sellerName"],
    },
  );

export type VehicleApprovalInput = z.infer<typeof vehicleApprovalSchema>;

// ---- Form field definitions for review UI ----
// Order matches Garage Register XLSX columns per UI-SPEC.

type FieldSection = "vehicle" | "transaction";
type FieldInputType = "text" | "number" | "textarea" | "date";

interface VehicleFormField {
  name: ExtractionField;
  label: string;
  type: FieldInputType;
  required: boolean;
  section: FieldSection;
}

export const VEHICLE_FORM_FIELDS: VehicleFormField[] = [
  // Vehicle section
  { name: "jobNumber", label: "Job Number", type: "text", required: false, section: "vehicle" },
  { name: "vin", label: "VIN", type: "text", required: true, section: "vehicle" },
  { name: "year", label: "Year", type: "number", required: true, section: "vehicle" },
  { name: "make", label: "Make", type: "text", required: true, section: "vehicle" },
  { name: "model", label: "Model", type: "text", required: true, section: "vehicle" },
  { name: "color", label: "Color", type: "text", required: false, section: "vehicle" },
  { name: "odometer", label: "Odometer", type: "number", required: false, section: "vehicle" },
  // Transaction section
  { name: "sellerName", label: "Seller Name", type: "text", required: false, section: "transaction" },
  { name: "sellerAddress", label: "Seller Address", type: "textarea", required: false, section: "transaction" },
  { name: "buyerName", label: "Buyer Name", type: "text", required: false, section: "transaction" },
  { name: "buyerAddress", label: "Buyer Address", type: "textarea", required: false, section: "transaction" },
  { name: "purchasePrice", label: "Purchase Price", type: "number", required: false, section: "transaction" },
  { name: "salePrice", label: "Sale Price", type: "number", required: false, section: "transaction" },
  { name: "purchaseDate", label: "Date Acquired", type: "date", required: false, section: "transaction" },
  { name: "saleDate", label: "Date Disposed", type: "date", required: false, section: "transaction" },
  { name: "stockNumber", label: "Stock Number", type: "text", required: false, section: "transaction" },
];
