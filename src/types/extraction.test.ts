import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ExtractionSchema,
  ConfidenceLevelSchema,
  type ExtractionResult,
  type ConfidenceLevel,
  type ExtractionFieldConfidence,
  FIELD_NAME_MAP,
  EXTRACTION_FIELDS,
  ExtractionFieldConfidenceSchema,
} from "./extraction";

describe("ConfidenceLevelSchema", () => {
  it("accepts exactly high, medium, low, not_found", () => {
    const valid = ["high", "medium", "low", "not_found"] as const;
    for (const level of valid) {
      const result = ConfidenceLevelSchema.parse(level);
      assert.equal(result, level);
    }
  });

  it("rejects invalid confidence levels", () => {
    assert.throws(() => ConfidenceLevelSchema.parse("unknown"), {
      message: /invalid/i,
    });
    assert.throws(() => ConfidenceLevelSchema.parse("HIGH"), {
      message: /invalid/i,
    });
    assert.throws(() => ConfidenceLevelSchema.parse(""), {
      message: /invalid/i,
    });
  });
});

describe("ExtractionSchema", () => {
  it("accepts valid extraction with all fields populated and confidence map", () => {
    const valid = {
      job_number: "26-J00001",
      vin: "1HGBH41JXMN109186",
      year: 2021,
      make: "Honda",
      model: "Civic",
      color: "Blue",
      odometer: 50000,
      seller_name: "ABC Motors",
      seller_address: "123 Main St",
      buyer_name: "John Doe",
      buyer_address: "456 Oak Ave",
      purchase_price: 15000,
      sale_price: 18000,
      purchase_date: "2025-01-15",
      sale_date: "2025-02-01",
      stock_number: "STK-001",
      confidence: {
        job_number: "high",
        vin: "high",
        year: "high",
        make: "high",
        model: "high",
        color: "medium",
        odometer: "high",
        seller_name: "high",
        seller_address: "high",
        buyer_name: "high",
        buyer_address: "high",
        purchase_price: "high",
        sale_price: "high",
        purchase_date: "high",
        sale_date: "high",
        stock_number: "medium",
      },
    };

    const result = ExtractionSchema.parse(valid);
    assert.equal(result.vin, "1HGBH41JXMN109186");
    assert.equal(result.make, "Honda");
    assert.equal(result.confidence.vin, "high");
  });

  it("accepts extraction with null fields and not_found confidence", () => {
    const partial = {
      job_number: null,
      vin: "1HGBH41JXMN109186",
      year: null,
      make: null,
      model: null,
      color: null,
      odometer: null,
      seller_name: null,
      seller_address: null,
      buyer_name: null,
      buyer_address: null,
      purchase_price: null,
      sale_price: null,
      purchase_date: null,
      sale_date: null,
      stock_number: null,
      confidence: {
        vin: "high",
        job_number: "not_found",
        year: "not_found",
        make: "not_found",
        model: "not_found",
        color: "not_found",
        odometer: "not_found",
        seller_name: "not_found",
        seller_address: "not_found",
        buyer_name: "not_found",
        buyer_address: "not_found",
        purchase_price: "not_found",
        sale_price: "not_found",
        purchase_date: "not_found",
        sale_date: "not_found",
        stock_number: "not_found",
      },
    };

    const result = ExtractionSchema.parse(partial);
    assert.equal(result.vin, "1HGBH41JXMN109186");
    assert.equal(result.year, null);
    assert.equal(result.confidence.year, "not_found");
  });

  it("rejects invalid confidence levels in extraction", () => {
    const invalid = {
      job_number: "26-J00001",
      vin: "1HGBH41JXMN109186",
      year: 2021,
      make: "Honda",
      model: "Civic",
      color: "Blue",
      odometer: 50000,
      seller_name: "ABC Motors",
      seller_address: "123 Main St",
      buyer_name: "John Doe",
      buyer_address: "456 Oak Ave",
      purchase_price: 15000,
      sale_price: 18000,
      purchase_date: "2025-01-15",
      sale_date: "2025-02-01",
      stock_number: "STK-001",
      confidence: {
        vin: "unknown", // invalid
      },
    };

    assert.throws(() => ExtractionSchema.parse(invalid));
  });
});

describe("ExtractionFieldConfidenceSchema", () => {
  it("accepts valid field confidence map", () => {
    const conf = { jobNumber: "high", vin: "medium", color: "not_found" };
    const result = ExtractionFieldConfidenceSchema.parse(conf);
    assert.equal(result.vin, "medium");
  });
});

describe("FIELD_NAME_MAP", () => {
  it("maps all snake_case API names to camelCase DB columns", () => {
    assert.equal(FIELD_NAME_MAP.job_number, "jobNumber");
    assert.equal(FIELD_NAME_MAP.vin, "vin");
    assert.equal(FIELD_NAME_MAP.seller_name, "sellerName");
    assert.equal(FIELD_NAME_MAP.purchase_price, "purchasePrice");
    assert.equal(FIELD_NAME_MAP.sale_date, "saleDate");
    assert.equal(FIELD_NAME_MAP.stock_number, "stockNumber");
  });

  it("has entries for all EXTRACTION_FIELDS", () => {
    const mapValues = new Set(Object.values(FIELD_NAME_MAP));
    for (const field of EXTRACTION_FIELDS) {
      assert.ok(mapValues.has(field), `Missing mapping for field: ${field}`);
    }
  });
});

console.log("All extraction type tests passed!");
