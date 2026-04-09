import type { ExtractionResult } from "@/types/extraction";

/**
 * A single field conflict between AP and AR extraction results.
 */
export interface FieldConflict {
  /** Human-readable field label (e.g., "VIN", "Year") */
  field: string;
  /** API field key in snake_case (e.g., "vin", "year") */
  fieldKey: string;
  /** Value from the AP (purchase) document */
  apValue: string | number | null;
  /** Value from the AR (sale) document */
  arValue: string | number | null;
}

/**
 * Result of cross-validating AP and AR extraction results.
 */
export interface CrossValidationResult {
  /** Whether any conflicts were found between the two documents */
  hasConflicts: boolean;
  /** List of specific field conflicts with both values */
  conflicts: FieldConflict[];
}

/**
 * Fields to cross-validate between AP and AR documents.
 * These are fields that should match across both document types
 * for the same vehicle transaction.
 */
const CROSS_VALIDATION_FIELDS: Array<{
  key: keyof Pick<ExtractionResult, "vin" | "year" | "make" | "model">;
  label: string;
  type: "string" | "number";
}> = [
  { key: "vin", label: "VIN", type: "string" },
  { key: "year", label: "Year", type: "number" },
  { key: "make", label: "Make", type: "string" },
  { key: "model", label: "Model", type: "string" },
];

/**
 * Normalize a string value for comparison: uppercase and trim whitespace.
 */
function normalizeString(value: string): string {
  return value.toUpperCase().trim();
}

/**
 * Cross-validate shared fields between AP and AR extraction results.
 *
 * Compares VIN, year, make, and model between the two documents per D-27.
 * Only reports a conflict when both values are non-null and different.
 * If either value is null (field not found), comparison is skipped per D-23.
 *
 * Called by the API route (Plan 03) only when both AP and AR extractions
 * exist for a vehicle (per D-28: single-PDF upload skips cross-validation).
 *
 * @param apResult - Extraction result from the AP (purchase) document
 * @param arResult - Extraction result from the AR (sale) document
 * @returns CrossValidationResult with any conflicts found
 */
export function crossValidateExtractions(
  apResult: ExtractionResult,
  arResult: ExtractionResult,
): CrossValidationResult {
  const conflicts: FieldConflict[] = [];

  for (const { key, label, type } of CROSS_VALIDATION_FIELDS) {
    const apValue = apResult[key];
    const arValue = arResult[key];

    // Skip comparison if either value is null (not found in document)
    if (apValue === null || arValue === null) {
      continue;
    }

    let isMatch: boolean;

    if (type === "string") {
      // Case-insensitive string comparison with whitespace normalization
      isMatch =
        normalizeString(String(apValue)) === normalizeString(String(arValue));
    } else {
      // Strict numeric equality
      isMatch = apValue === arValue;
    }

    if (!isMatch) {
      conflicts.push({
        field: label,
        fieldKey: key,
        apValue,
        arValue,
      });
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
}
