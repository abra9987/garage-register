export const DEAL_EXTRACTION_SYSTEM_PROMPT = `You are a document data extraction specialist for a Canadian auto dealer (AD Auto Export, Ontario).
You extract vehicle and transaction data from two types of documents:
1. Window Sticker (Monroney sticker) — contains MSRP, vehicle specs, options, colors
2. Accounts Payable (AP) Invoice — purchase invoice from supplier with buying price, taxes, and client/buyer info

EXTRACTION RULES:
1. Extract ALL fields listed in the output schema. If a field is not present, return null.
2. VIN must be exactly 17 characters (letters A-H, J-N, P, R-Z and digits 0-9; no I, O, Q).
3. Prices must be numeric values only — no currency symbols, no commas.
4. MSRP: total MSRP from the window sticker (the final total, including destination charge if shown separately on the sticker).
5. Buying Price: the invoice total BEFORE tax (pre-HST amount).
6. HST: the HST (Harmonized Sales Tax) amount from the invoice. If not explicitly labeled as HST, look for tax line items. May not be present on all invoices.
7. Currency: detect from the invoice — "USD" or "CAD". Look at currency symbols, labels, or country of origin.
8. For client info: extract the buyer/customer company name, full address, phone, and email from the invoice.
9. Vehicle description: extract year, make, model, trim/package level, exterior color, interior color, engine/drivetrain info.
10. Body style: extract the body style (e.g., "Sedan", "SUV", "Convertible", "Coupe", "Truck") from the window sticker.
11. This may be a scanned document — use vision to read the content.`;

export function getDealExtractionUserPrompt(): string {
  return `Two documents are attached:
1. WINDOW STICKER — extract vehicle description and MSRP
2. AP INVOICE — extract buying price, HST, and client/buyer information

Return a JSON object with these fields:

Vehicle (from Window Sticker):
- vehicle_year: Model year (number)
- vehicle_make: Manufacturer (e.g., Mercedes-Benz, BMW, Toyota)
- vehicle_model: Model name (e.g., GLE 450, X5, Camry)
- vehicle_trim: Trim/package level (e.g., 4MATIC, xDrive, Limited)
- body_style: Body style (e.g., "Sedan", "SUV", "Convertible", "Coupe", "Truck", "Hatchback")
- exterior_color: Exterior color name
- interior_color: Interior color name
- engine: Engine description (e.g., "3.0L I6 Turbo", "5.0L V8")
- vin: Vehicle Identification Number (exactly 17 characters)
- msrp: Total MSRP in dollars (number, no currency symbol)

Transaction (from AP Invoice):
- buying_price: Purchase price before tax (number)
- hst: HST tax amount (number), null if not present
- currency: Currency code ("USD" or "CAD") detected from the invoice
- invoice_number: Invoice/reference number
- invoice_date: Invoice date (YYYY-MM-DD)

Client/Buyer (from AP Invoice):
- client_name: Company or person name
- client_address: Full address
- client_phone: Phone number
- client_email: Email address`;
}

export const DEAL_EXTRACTION_JSON_SCHEMA = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      vehicle_year: { anyOf: [{ type: "number" }, { type: "null" }] },
      vehicle_make: { anyOf: [{ type: "string" }, { type: "null" }] },
      vehicle_model: { anyOf: [{ type: "string" }, { type: "null" }] },
      vehicle_trim: { anyOf: [{ type: "string" }, { type: "null" }] },
      body_style: { anyOf: [{ type: "string" }, { type: "null" }] },
      exterior_color: { anyOf: [{ type: "string" }, { type: "null" }] },
      interior_color: { anyOf: [{ type: "string" }, { type: "null" }] },
      engine: { anyOf: [{ type: "string" }, { type: "null" }] },
      vin: { anyOf: [{ type: "string" }, { type: "null" }] },
      msrp: { anyOf: [{ type: "number" }, { type: "null" }] },
      buying_price: { anyOf: [{ type: "number" }, { type: "null" }] },
      hst: { anyOf: [{ type: "number" }, { type: "null" }] },
      currency: { anyOf: [{ type: "string" }, { type: "null" }] },
      invoice_number: { anyOf: [{ type: "string" }, { type: "null" }] },
      invoice_date: { anyOf: [{ type: "string" }, { type: "null" }] },
      client_name: { anyOf: [{ type: "string" }, { type: "null" }] },
      client_address: { anyOf: [{ type: "string" }, { type: "null" }] },
      client_phone: { anyOf: [{ type: "string" }, { type: "null" }] },
      client_email: { anyOf: [{ type: "string" }, { type: "null" }] },
    },
    required: [
      "vehicle_year",
      "vehicle_make",
      "vehicle_model",
      "vehicle_trim",
      "body_style",
      "exterior_color",
      "interior_color",
      "engine",
      "vin",
      "msrp",
      "buying_price",
      "hst",
      "currency",
      "invoice_number",
      "invoice_date",
      "client_name",
      "client_address",
      "client_phone",
      "client_email",
    ],
    additionalProperties: false,
  },
};
