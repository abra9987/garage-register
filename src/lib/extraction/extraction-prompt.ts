// Extraction prompt for Claude API structured output
// Handles all 6 document types, bilingual (EN/FR), scanned PDFs
// Per D-19: Single structured prompt, no per-type templates

export const EXTRACTION_SYSTEM_PROMPT = `You are a document data extraction specialist for a Canadian auto dealer in Ontario.
You extract vehicle transaction data from invoices, bills of sale, and dealer forms.

DOCUMENT TYPES YOU HANDLE:
- Simple Dealer Invoices
- US Supplier Invoices (QuickBooks format)
- Wholesale Bills of Sale
- OMVIC Dealer Forms (Ontario) -- fields may be scattered across the page
- Quebec Bills of Sale (French language)
- AD Auto Export AR invoices

EXTRACTION RULES:
1. Extract ALL fields listed in the output schema. If a field is not present in the document, return null for the value and "not_found" for its confidence entry.
2. For each extracted field, report your confidence level in the "confidence" object using the field's snake_case key:
   - "high": clearly readable, unambiguous value
   - "medium": partially visible, inferred from context, or minor uncertainty
   - "low": barely legible, guessed, or conflicting information in the document
   - "not_found": field is not present in the document at all
3. VIN must be exactly 17 characters (letters A-H, J-N, P, R-Z and digits 0-9; no I, O, or Q). If you can read most but not all characters, report what you see with "low" confidence.
4. Dates must be in YYYY-MM-DD format. Convert from any source format (MM/DD/YYYY, DD/MM/YYYY, written month, etc.).
5. Prices must be numeric values only -- no currency symbols, no commas. Use the pre-tax amount if both pre-tax and total are shown.
6. Job numbers follow the pattern "26-JXXXXX" (fiscal year prefix + J + sequential digits). Look for this pattern or similar job/deal/stock references.
7. This document may be in English or French. Extract data regardless of language.
8. This may be a scanned document -- use vision to read the content even if the text layer is poor or absent.
9. Odometer should be a numeric value in kilometers. If shown in miles, convert to km (multiply by 1.60934) and report with "medium" confidence.
10. For seller/buyer names and addresses, extract the full value as shown on the document.`;

/**
 * Build the user prompt for extraction, parameterized by document type.
 * @param docType - "ap" for purchase from supplier, "ar" for sale to customer
 */
export function getExtractionUserPrompt(docType: "ap" | "ar"): string {
  const typeLabel =
    docType === "ap"
      ? "AP (purchase from supplier)"
      : "AR (sale to customer)";

  return `Extract all vehicle transaction data from this ${typeLabel} document.

Return a JSON object with these exact fields:
- job_number: The deal/job number (pattern: 26-JXXXXX)
- vin: Vehicle Identification Number (exactly 17 characters)
- year: Vehicle model year (number)
- make: Vehicle manufacturer (e.g., Toyota, Ford)
- model: Vehicle model (e.g., Camry, F-150)
- color: Vehicle exterior color
- odometer: Odometer reading in kilometers (number)
- seller_name: Full name of the seller
- seller_address: Full address of the seller
- buyer_name: Full name of the buyer
- buyer_address: Full address of the buyer
- purchase_price: Purchase/acquisition price before tax (number)
- sale_price: Sale price before tax (number)
- purchase_date: Date of purchase (YYYY-MM-DD)
- sale_date: Date of sale (YYYY-MM-DD)
- stock_number: Stock/inventory number if different from job number
- confidence: Object mapping each field name to its confidence level ("high", "medium", "low", or "not_found")

Use null for any field value that cannot be found in the document, and "not_found" for its confidence.`;
}

/**
 * Hand-written JSON schema for Claude API output_config.format.
 * Used instead of zodOutputFormat() due to Zod v4 z.record() incompatibility
 * (produces additionalProperties:false with empty properties for record types,
 * which blocks dynamic confidence keys).
 *
 * Matches SDK's JSONOutputFormat: { type: "json_schema", schema: { ... } }
 */
export const EXTRACTION_JSON_SCHEMA = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      job_number: { anyOf: [{ type: "string" }, { type: "null" }] },
      vin: { anyOf: [{ type: "string" }, { type: "null" }] },
      year: { anyOf: [{ type: "number" }, { type: "null" }] },
      make: { anyOf: [{ type: "string" }, { type: "null" }] },
      model: { anyOf: [{ type: "string" }, { type: "null" }] },
      color: { anyOf: [{ type: "string" }, { type: "null" }] },
      odometer: { anyOf: [{ type: "number" }, { type: "null" }] },
      seller_name: { anyOf: [{ type: "string" }, { type: "null" }] },
      seller_address: { anyOf: [{ type: "string" }, { type: "null" }] },
      buyer_name: { anyOf: [{ type: "string" }, { type: "null" }] },
      buyer_address: { anyOf: [{ type: "string" }, { type: "null" }] },
      purchase_price: { anyOf: [{ type: "number" }, { type: "null" }] },
      sale_price: { anyOf: [{ type: "number" }, { type: "null" }] },
      purchase_date: { anyOf: [{ type: "string" }, { type: "null" }] },
      sale_date: { anyOf: [{ type: "string" }, { type: "null" }] },
      stock_number: { anyOf: [{ type: "string" }, { type: "null" }] },
      confidence: {
        type: "object",
        properties: {
          job_number: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
          vin: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
          year: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
          make: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
          model: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
          color: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
          odometer: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
          seller_name: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
          seller_address: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
          buyer_name: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
          buyer_address: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
          purchase_price: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
          sale_price: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
          purchase_date: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
          sale_date: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
          stock_number: {
            type: "string",
            enum: ["high", "medium", "low", "not_found"],
          },
        },
        required: [
          "job_number",
          "vin",
          "year",
          "make",
          "model",
          "color",
          "odometer",
          "seller_name",
          "seller_address",
          "buyer_name",
          "buyer_address",
          "purchase_price",
          "sale_price",
          "purchase_date",
          "sale_date",
          "stock_number",
        ],
        additionalProperties: false,
      },
    },
    required: [
      "job_number",
      "vin",
      "year",
      "make",
      "model",
      "color",
      "odometer",
      "seller_name",
      "seller_address",
      "buyer_name",
      "buyer_address",
      "purchase_price",
      "sale_price",
      "purchase_date",
      "sale_date",
      "stock_number",
      "confidence",
    ],
    additionalProperties: false,
  },
};
