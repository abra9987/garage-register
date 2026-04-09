import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateVin, type VinValidationResult } from "./vin";

describe("validateVin", () => {
  it("returns valid=true for all-ones VIN (11111111111111111)", () => {
    const result = validateVin("11111111111111111");
    assert.equal(result.valid, true);
    assert.equal(result.formatValid, true);
    assert.equal(result.checkDigitValid, true);
  });

  it("returns valid=true for real Honda VIN (1HGBH41JXMN109186)", () => {
    const result = validateVin("1HGBH41JXMN109186");
    assert.equal(result.valid, true);
    assert.equal(result.formatValid, true);
    assert.equal(result.checkDigitValid, true);
  });

  it("returns valid=false with 'VIN is empty' for null input", () => {
    const result = validateVin(null);
    assert.equal(result.valid, false);
    assert.equal(result.error, "VIN is empty");
  });

  it("returns valid=false with '17 characters' error for short VIN", () => {
    const result = validateVin("SHORT");
    assert.equal(result.valid, false);
    assert.equal(result.formatValid, false);
    assert.ok(result.error!.includes("17 characters"), `Error should mention 17 characters, got: ${result.error}`);
  });

  it("returns valid=false with 'invalid characters' for VIN containing O", () => {
    // O is not allowed in VIN (only A-H, J-N, P, R-Z, 0-9)
    const result = validateVin("1HGBH41JXMN10918O");
    assert.equal(result.valid, false);
    assert.equal(result.formatValid, false);
    assert.ok(result.error!.includes("invalid characters"), `Error should mention invalid characters, got: ${result.error}`);
  });

  it("returns specific check digit error with expected and got values", () => {
    // Modify check digit (position 9) to make it invalid
    // 1HGBH41JXMN109186 is valid -- change X (pos 9) to 0
    const result = validateVin("1HGBH41J0MN109186");
    assert.equal(result.valid, false);
    assert.equal(result.formatValid, true);
    assert.equal(result.checkDigitValid, false);
    assert.ok(result.error!.includes("expected"), `Error should contain 'expected', got: ${result.error}`);
    assert.ok(result.error!.includes("got"), `Error should contain 'got', got: ${result.error}`);
    assert.equal(result.expectedCheckDigit, "X");
    assert.equal(result.actualCheckDigit, "0");
  });

  it("returns valid=false with 'VIN is empty' for empty string", () => {
    const result = validateVin("");
    assert.equal(result.valid, false);
    assert.equal(result.error, "VIN is empty");
  });

  it("handles lowercase input by converting to uppercase", () => {
    const result = validateVin("1hgbh41jxmn109186");
    assert.equal(result.valid, true);
    assert.equal(result.formatValid, true);
    assert.equal(result.checkDigitValid, true);
  });
});

console.log("All VIN validation tests passed!");
