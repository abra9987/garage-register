import { z } from "zod";

// Confidence levels for extracted fields
export const ConfidenceLevelSchema = z.enum([
  "high",
  "medium",
  "low",
  "not_found",
]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

// Field names match both Claude prompt output and vehicles table columns (camelCase)
export const EXTRACTION_FIELDS = [
  "jobNumber",
  "vin",
  "year",
  "make",
  "model",
  "color",
  "odometer",
  "sellerName",
  "sellerAddress",
  "buyerName",
  "buyerAddress",
  "purchasePrice",
  "salePrice",
  "purchaseDate",
  "saleDate",
  "stockNumber",
] as const;

export type ExtractionField = (typeof EXTRACTION_FIELDS)[number];

// Per-field confidence map using camelCase DB column names
// Values are optional since not all fields may have confidence reported
export const ExtractionFieldConfidenceSchema = z.record(
  z.enum(EXTRACTION_FIELDS),
  ConfidenceLevelSchema.optional(),
);
export type ExtractionFieldConfidence = z.infer<
  typeof ExtractionFieldConfidenceSchema
>;

// Schema for Claude API structured output response (snake_case field names)
export const ExtractionSchema = z.object({
  job_number: z.string().nullable(),
  vin: z.string().nullable(),
  year: z.number().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  color: z.string().nullable(),
  odometer: z.number().nullable(),
  seller_name: z.string().nullable(),
  seller_address: z.string().nullable(),
  buyer_name: z.string().nullable(),
  buyer_address: z.string().nullable(),
  purchase_price: z.number().nullable(),
  sale_price: z.number().nullable(),
  purchase_date: z.string().nullable(),
  sale_date: z.string().nullable(),
  stock_number: z.string().nullable(),
  confidence: z.record(z.string(), ConfidenceLevelSchema),
});

export type ExtractionResult = z.infer<typeof ExtractionSchema>;

// Map from Claude API snake_case field names to DB camelCase column names
export const FIELD_NAME_MAP: Record<string, ExtractionField> = {
  job_number: "jobNumber",
  vin: "vin",
  year: "year",
  make: "make",
  model: "model",
  color: "color",
  odometer: "odometer",
  seller_name: "sellerName",
  seller_address: "sellerAddress",
  buyer_name: "buyerName",
  buyer_address: "buyerAddress",
  purchase_price: "purchasePrice",
  sale_price: "salePrice",
  purchase_date: "purchaseDate",
  sale_date: "saleDate",
  stock_number: "stockNumber",
};
